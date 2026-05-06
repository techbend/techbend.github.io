#!/usr/bin/env python3
"""
Sync PyPI download stats from ClickPy (ClickHouse) to local JSON files.

For each package: fetches ALL historical download data in a single query
from the pypi_downloads_per_day_by_version materialized view.
"""

import json
from datetime import datetime, timezone
from pathlib import Path
import pandas as pd
import clickhouse_connect

# Configuration
USERNAME = "tavallaie"
PYPI_DATA_DIR = Path("static/data/pypi")
PYPI_JSON_PATH = Path("static/data/pypi.json")

PACKAGES_JSON_PATH = Path("static/data/packages.json")


# ClickPy ClickHouse connection (official public instance)
CLICKHOUSE_HOST = "sql-clickhouse.clickhouse.com"
CLICKHOUSE_PORT = 443
CLICKHOUSE_USER = "demo"
CLICKHOUSE_PASSWORD = ""
CLICKHOUSE_DATABASE = "pypi"


def load_packages(username: str = USERNAME) -> list[str]:
    """Load package list from packages.json; fall back to scraping if missing."""
    if PACKAGES_JSON_PATH.exists():
        with open(PACKAGES_JSON_PATH) as f:
            data = json.load(f)
        packages = data.get("packages", [])
        if packages:
            print(f"   Loaded {len(packages)} packages from {PACKAGES_JSON_PATH}")
            return packages

    print(f"   {PACKAGES_JSON_PATH} not found or empty, falling back to scraping...")
    from discover_packages import get_pypi_packages

    return get_pypi_packages(username)


def get_clickhouse_client():
    """Create and return a ClickHouse client connected to ClickPy."""
    return clickhouse_connect.get_client(
        host=CLICKHOUSE_HOST,
        port=CLICKHOUSE_PORT,
        username=CLICKHOUSE_USER,
        password=CLICKHOUSE_PASSWORD,
        database=CLICKHOUSE_DATABASE,
        secure=True,
        settings={"max_execution_time": 600},
    )


def ensure_data_dir():
    """Create data directories if they don't exist."""
    PYPI_DATA_DIR.mkdir(parents=True, exist_ok=True)


def fetch_package_data(client, package: str) -> pd.DataFrame:
    """
    Fetch ALL download stats for a package from ClickHouse.
    Uses pypi_downloads_per_day_by_version for day+version granularity.
    """
    query = """
    SELECT 
      date,
      version,
      sum(count) as downloads
    FROM pypi_downloads_per_day_by_version
    WHERE project = %(package)s
    GROUP BY date, version
    ORDER BY date DESC, downloads DESC
    """

    print(f"  Fetching all data for {package}...")
    df = client.query_df(query, parameters={"package": package})

    if df.empty:
        print("    → No data found")
        return df

    # Rename date to day for consistency with existing JSON format
    df = df.rename(columns={"date": "day"})
    df["day"] = df["day"].astype(str)

    total_downloads = df["downloads"].sum()
    print(f"    → {len(df)} rows, {total_downloads:,} total downloads")
    print(f"    → Date range: {df['day'].min()} to {df['day'].max()}")

    return df


def save_package_data(package: str, df: pd.DataFrame):
    """Save package data as JSON and CSV."""
    json_path = PYPI_DATA_DIR / f"{package}.json"
    csv_path = PYPI_DATA_DIR / f"{package}.csv"

    if df.empty:
        with open(json_path, "w") as f:
            json.dump([], f, indent=2)
        pd.DataFrame(columns=["day", "version", "downloads"]).to_csv(
            csv_path, index=False
        )
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
    total = sum(p["total_downloads"] for p in manifest["packages"])
    print(f"   Total downloads: {total:,}")


def main():
    print("=" * 50)
    print("🔍 PyPI Stats Sync — ClickPy Edition")
    print("=" * 50)

    ensure_data_dir()

    # Initialize ClickHouse client
    print("\n📡 Connecting to ClickPy (ClickHouse)...")
    client = get_clickhouse_client()
    print(f"   Host: {CLICKHOUSE_HOST}:{CLICKHOUSE_PORT}")
    print(f"   User: {CLICKHOUSE_USER}")
    print(f"   Database: {CLICKHOUSE_DATABASE}")

    # Quick connection test
    try:
        client.query("SELECT 1 as test").result_rows
        print("   ✓ Connection OK")
    except Exception as e:
        print(f"   ✗ Connection failed: {e}")
        return

    # Load packages (from saved list or fallback to scraping)
    print(f"\n🔎 Loading packages for user: {USERNAME}")
    packages = load_packages(USERNAME)
    print(f"   Found: {', '.join(packages)}")

    # Fetch and save each package
    for package in packages:
        print(f"\n📦 Processing: {package}")
        try:
            df = fetch_package_data(client, package)
            save_package_data(package, df)
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
