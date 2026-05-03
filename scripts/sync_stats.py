#!/usr/bin/env python3
"""
Sync PyPI download stats from BigQuery to local JSON files.
Run by GitHub Actions daily.
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
import calendar
import pandas as pd
from google.cloud import bigquery

from discover_packages import get_pypi_packages

# Configuration
USERNAME = "tavallaie"
DATA_DIR = Path("data")
YEARS_OF_HISTORY = 2  # How far back to query
MAX_MONTHS_PER_QUERY = 6  # Split large queries to save on scan size


def ensure_data_dir():
    """Create data directory if it doesn't exist."""
    DATA_DIR.mkdir(exist_ok=True)


def get_date_ranges() -> list[tuple[str, str]]:
    """
    Split the time range into chunks to reduce BigQuery scan size.
    Returns list of (start_date, end_date) tuples.
    """
    end = datetime.now(timezone.utc)
    start = end.replace(year=end.year - YEARS_OF_HISTORY, month=1, day=1)

    ranges = []
    current = start
    while current < end:
        # Properly add months with year rollover
        total_months = current.year * 12 + current.month + MAX_MONTHS_PER_QUERY
        target_year = total_months // 12
        target_month = total_months % 12 or 12

        # Clamp to last day of target month
        last_day = calendar.monthrange(target_year, target_month)[1]
        target_day = min(current.day, last_day)

        chunk_end = min(
            datetime(target_year, target_month, target_day, tzinfo=timezone.utc), end
        )

        ranges.append((current.strftime("%Y-%m-%d"), chunk_end.strftime("%Y-%m-%d")))
        current = chunk_end

    return ranges


def query_package_stats(client: bigquery.Client, package: str) -> pd.DataFrame:
    """
    Query BigQuery for a single package's download stats.
    Splits into date ranges to manage query size.
    """
    all_data = []
    date_ranges = get_date_ranges()

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

    # Aggregate duplicate rows (same day/version/system/python/installer)
    combined = combined.groupby(
        ["day", "version", "system", "python_version", "installer"], as_index=False
    )["downloads"].sum()

    return combined.sort_values("day", ascending=False)


def save_package_data(package: str, df: pd.DataFrame):
    """Save package data as JSON and CSV."""
    if df.empty:
        print(f"  ⚠ No data for {package}, skipping")
        return

    # Convert day to string for JSON serialization
    df["day"] = df["day"].astype(str)

    # Save JSON
    json_path = DATA_DIR / f"{package}.json"
    records = df.to_dict(orient="records")
    with open(json_path, "w") as f:
        json.dump(records, f, indent=2)

    # Save CSV
    csv_path = DATA_DIR / f"{package}.csv"
    df.to_csv(csv_path, index=False)

    # Calculate and print summary
    total = df["downloads"].sum()
    latest_day = df["day"].iloc[0] if not df.empty else "N/A"
    print(f"  ✓ Saved: {len(df)} rows, {total:,} total downloads")


def generate_manifest(packages: list[str]):
    """Generate manifest file with metadata."""
    manifest = {
        "username": USERNAME,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "package_count": len(packages),
        "packages": [],
    }

    for pkg in packages:
        json_path = DATA_DIR / f"{pkg}.json"
        if json_path.exists():
            with open(json_path) as f:
                data = json.load(f)

            total_downloads = sum(row["downloads"] for row in data)
            latest_date = max(row["day"] for row in data) if data else None
            earliest_date = min(row["day"] for row in data) if data else None

            manifest["packages"].append(
                {
                    "name": pkg,
                    "total_downloads": total_downloads,
                    "data_points": len(data),
                    "date_range": {"from": earliest_date, "to": latest_date},
                }
            )

    manifest_path = DATA_DIR / "manifest.json"
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"\n📋 Manifest saved: {manifest_path}")
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
            df = query_package_stats(client, package)
            save_package_data(package, df)
        except Exception as e:
            print(f"  ✗ Error: {e}")
            continue

    # Generate manifest
    generate_manifest(packages)

    print("\n" + "=" * 50)
    print("✅ Sync complete!")
    print("=" * 50)


if __name__ == "__main__":
    main()
