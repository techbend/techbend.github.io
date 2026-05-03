#!/usr/bin/env python3
"""Diagnostic script to inspect ClickPy schema."""

import clickhouse_connect

client = clickhouse_connect.get_client(
    host="sql-clickhouse.clickhouse.com",
    port=443,
    username="demo",
    password="",
    database="pypi",
    secure=True,
)

print("=== Tables in pypi database ===")
result = client.query("SHOW TABLES")
for row in result.result_rows:
    print(f"  {row[0]}")

print("\n=== DESCRIBE pypi_downloads ===")
result = client.query("DESCRIBE pypi_downloads")
for row in result.result_rows:
    print(f"  {row[0]}: {row[1]}")

print("\n=== Sample from pypi_downloads ===")
result = client.query("SELECT * FROM pypi_downloads WHERE project = 'requests' LIMIT 3")
print("Columns:", result.column_names)
for row in result.result_rows:
    print(row)

print("\n=== Available columns in pypi_downloads ===")
result = client.query(
    "SELECT name, type FROM system.columns WHERE table = 'pypi_downloads' AND database = 'pypi'"
)
for row in result.result_rows:
    print(f"  {row[0]} ({row[1]})")
