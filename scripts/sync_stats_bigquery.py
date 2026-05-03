#!/usr/bin/env python3
"""
Sync PyPI download stats from BigQuery to local JSON files.

For each package:
  - On first run: discovers first/last download dates in BigQuery and fetches everything.
  - On subsequent runs: reads local data, finds the latest day already stored,
    and queries BigQuery only for new days. This makes daily syncs fast and cheap.

Run by GitHub Actions daily.
"""

import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
import calendar
import pandas as pd
from google.cloud import bigquery

from discover_packages import get_pypi_packages

# Configuration
USERNAME = "tavallaie"
PYPI_DATA_DIR = Path("static/data/pypi")
PYPI_JSON_PATH = Path("static/data/pypi.json")
MAX_MONTHS_PER_QUERY = 12  # Chunk size for large date ranges


def ensure_data_dir():
    """Create data directories if they don't exist."""
    PYPI_DATA_DIR.mkdir(parents=True, exist_ok=True)


def load_existing_data(package: str) -> pd.DataFrame:
    """Load existing package data from local JSON file."""
    json_path = PYPI_DATA_DIR / f"{package}.json"
    if not json_path.exists():
        return pd.DataFrame()
    with open(json_path) as f:
        data = json.load(f)
    if not data:
        return pd.DataFrame()
    return pd.DataFrame(data)


def get_package_date_range(client: bigquery.Client, package: str) -> tuple[str, str] | None:
    """
    Find the first and last download dates for a package in BigQuery.
    Returns (first_date_iso, last_date_iso) or None if never downloaded.
    """
    query = """
    SELECT 
      MIN(DATE(timestamp)) as first_date,
      MAX(DATE(timestamp)) as last_date
    FROM `bigquery-public-data.pypi.file_downloads`
    WHERE file.project = @package
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("package", "STRING", package),
        ]
    )

    print(f"  Finding date range for {package}...")
    df = client.query(query, job_config=job_config).to_dataframe()

    if df.empty or pd.isna(df["first_date"].iloc[0]):
        print(f"    → No downloads found in BigQuery")
        return None

    first_date = df["first_date"].iloc[0].isoformat()
    last_date = df["last_date"].iloc[0].isoformat()
    print(f"    → {first_date} to {last_date}")
    return first_date, last_date


def split_date_range(start_iso: str, end_iso: str) -> list[tuple[str, str]]:
    """
    Split an ISO date range into chunks of MAX_MONTHS_PER_QUERY months.
    Returns list of (start_date, end_date) tuples as ISO strings.
    """
    from datetime import date as dt_date

    start = dt_date.fromisoformat(start_iso)
    end = dt_date.fromisoformat(end_iso)

    ranges = []
    current = start
    while current <= end:
        total_months = current.year * 12 + current.month + MAX_MONTHS_PER_QUERY
        target_year = total_months // 12
        target_month = total_months % 12 or 12

        last_day = calendar.monthrange(target_year, target_month)[1]
        target_day = min(current.day, last_day)

        chunk_end = min(dt_date(target_year, target_month, target_day), end)
        ranges.append((current.isoformat(), chunk_end.isoformat()))
        current = chunk_end + timedelta(days=1)

    return ranges


def query_package_stats(
    client: bigquery.Client, package: str, first_date: str, last_date: str
) -> pd.DataFrame:
    """
    Query BigQuery for a single package's download stats across a date range.
    Splits into chunks to manage query size.
    """
    all_data = []
    date_ranges = split_date_range(first_date, last_date)

    for start_date, end_date in date_ranges:
        query = """
        SELECT 
          DATE(timestamp) as day,
          file.version as version,
          details.system.name as system,
          details.python as python_version,
          details.installer.name as installer,
          COUNT(*) as downloads
        FROM `bigquery-public-data.pypi.file_downloads`
        WHERE file.project = @package
          AND DATE(timestamp) >= @start_date
          AND DATE(timestamp) < @end_date
        GROUP BY day, version, system, python_version, installer
        ORDER BY day DESC, downloads DESC
        """

        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("package", "STRING", package),
                bigquery.ScalarQueryParameter("start_date", "STRING", start_date),
                bigquery.ScalarQueryParameter("end_date", "STRING", end_date),
            ]
        )

        print(f"  Querying {package}: {start_date} to {end_date}...")
        df = client.query(query, job_config=job_config).to_dataframe()

        if not df.empty:
            all_data.append(df)
            print(f"    → {len(df)} rows")
        else:
            print(f"    → No data")

    if not all_data:
        return pd.DataFrame()

    combined = pd.concat(all_data, ignore_index=True)
    combined["day"] = combined["day"].astype(str)

    # Aggregate duplicate rows (same day/version/system/python/installer)
    combined = combined.groupby(
        ["day", "version", "system", "python_version", "installer"], as_index=False
    )["downloads"].sum()

    return combined.sort_values("day", ascending=False)


def save_package_data(package: str, df: pd.DataFrame):
    """Save package data as JSON and CSV."""
    json_path = PYPI_DATA_DIR / f"{package}.json"
    csv_path = PYPI_DATA_DIR / f"{package}.csv"

    if df.empty:
        with open(json_path, "w") as f:
            json.dump([], f, indent=2)
        pd.DataFrame(
            columns=["day", "version", "system", "python_version", "installer", "downloads"]
        ).to_csv(csv_path, index=False)
        print(f"  ⚠ No data for {package}, wrote empty files")
        return

    # Save JSON
    records = df.to_dict(orient="records")
    with open(json_path, "w") as f:
        json.dump(records, f, indent=2)

    # Save CSV
    df.to_csv(csv_path, index=False)

    total = df["downloads"].sum()
    print(f"  ✓ Saved: {len(df)} rows, {total:,} total downloads")


def sync_package(client: bigquery.Client, package: str) -> pd.DataFrame:
    """
    Sync a single package.
    Uses incremental updates when local data already exists.
    Returns the final DataFrame (may be empty).
    """
    existing_df = load_existing_data(package)

    if existing_df.empty:
        # First run — discover the full date range and fetch everything
        date_range = get_package_date_range(client, package)
        if date_range is None:
            save_package_data(package, pd.DataFrame())
            return pd.DataFrame()

        first_date, last_date = date_range
        df = query_package_stats(client, package, first_date, last_date)
        save_package_data(package, df)
        return df

    # Incremental — figure out what we already have
    last_date = existing_df["day"].max()
    next_date = last_date
    today = datetime.now(timezone.utc).date().isoformat()

    if next_date > today:
        print(f"  → Already up to date (last: {last_date})")
        return existing_df

    print(f"  → Incremental sync from {next_date} to {today}")
    df_new = query_package_stats(client, package, next_date, today)

    if df_new.empty:
        print(f"  → No new data since {last_date}")
        return existing_df

    # Replace overlapping days instead of summing
    existing_df = existing_df[existing_df["day"] < next_date]
    combined = pd.concat([existing_df, df_new], ignore_index=True)
    combined = combined.sort_values("day", ascending=False)

    save_package_data(package, combined)
    return combined


def generate_pypi_json(packages: list[str]):
    """Generate pypi.json manifest file with metadata for all packages."""
    manifest = {
        "username": USERNAME,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "package_count": len(packages),
        "packages": [],
    }

    for pkg in packages:
        json_path = PYPI_DATA_DIR / f"{pkg}.json"
        if json_path.exists():
            with open(json_path) as f:
                data = json.load(f)

            total_downloads = sum(row["downloads"] for row in data)
            latest_date = max(row["day"] for row in data) if data else None
            earliest_date = min(row["day"] for row in data) if data else None

            manifest["packages"].append(
                {
                    "name": pkg,
                    "first_seen": earliest_date,
                    "total_downloads": total_downloads,
                    "data_points": len(data),
                    "date_range": {"from": earliest_date, "to": latest_date},
                }
            )

    with open(PYPI_JSON_PATH, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"\n📋 PyPI manifest saved: {PYPI_JSON_PATH}")
    print(f"   Total packages: {manifest['package_count']}")
    print(
        f"   Total downloads: {sum(p['total_downloads'] for p in manifest['packages']):,}"
    )


def main():
    print("=" * 50)
    print("🔍 PyPI Stats Sync")
    print("=" * 50)

    ensure_data_dir()

    # Initialize BigQuery client
    print("\n📡 Connecting to BigQuery...")
    client = bigquery.Client()
    print(f"   Project: {client.project}")

    # Discover packages
    print(f"\n🔎 Discovering packages for user: {USERNAME}")
    packages = get_pypi_packages(USERNAME)
    print(f"   Found: {', '.join(packages)}")

    # Query and save each package
    for package in packages:
        print(f"\n📦 Processing: {package}")
        try:
            sync_package(client, package)
        except Exception as e:
            print(f"  ✗ Error: {e}")
            continue

    # Generate pypi.json
    generate_pypi_json(packages)

    print("\n" + "=" * 50)
    print("✅ Sync complete!")
    print("=" * 50)


if __name__ == "__main__":
    main()
