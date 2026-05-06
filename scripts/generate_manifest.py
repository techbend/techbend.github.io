#!/usr/bin/env python3
"""
Generate manifest.json by combining GitHub profile data and PyPI stats.

Reads:
  - static/data/github.json  → pinned repos, contributions_last_year
  - static/data/pypi.json    → top 6 most-downloaded packages

Writes:
  - static/data/manifest.json
"""

import json
from datetime import datetime, timezone
from pathlib import Path

import requests

GITHUB_JSON_PATH = Path("static/data/github.json")
PYPI_JSON_PATH = Path("static/data/pypi.json")
MANIFEST_JSON_PATH = Path("static/data/manifest.json")
TOP_PACKAGES_COUNT = 6


def load_json(path: Path) -> dict | list:
    """Load JSON from the given path."""
    with open(path, "r") as f:
        return json.load(f)


def fetch_pypi_metadata(package_name: str) -> dict:
    """Fetch version and summary from PyPI JSON API."""
    try:
        resp = requests.get(
            f"https://pypi.org/pypi/{package_name}/json",
            headers={"User-Agent": "TechBend-Manifest/1.0"},
            timeout=15,
        )
        resp.raise_for_status()
        info = resp.json().get("info", {})
        return {
            "version": info.get("version", ""),
            "summary": info.get("summary", ""),
            "requires_python": info.get("requires_python", ""),
        }
    except Exception:
        return {}


def get_top_packages(pypi_data: dict, count: int = TOP_PACKAGES_COUNT) -> list[dict]:
    """Return the top N packages by total_downloads, enriched with PyPI metadata."""
    packages = pypi_data.get("packages", [])
    sorted_packages = sorted(
        packages, key=lambda p: p.get("total_downloads", 0), reverse=True
    )
    top = sorted_packages[:count]

    for pkg in top:
        meta = fetch_pypi_metadata(pkg["name"])
        pkg["version"] = meta.get("version", "")
        pkg["summary"] = meta.get("summary", "")
        pkg["requires_python"] = meta.get("requires_python", "")

    return top


def generate_manifest() -> dict:
    """Build the manifest dictionary from GitHub and PyPI data."""
    github_data = load_json(GITHUB_JSON_PATH)
    pypi_data = load_json(PYPI_JSON_PATH)

    manifest = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "public_repos": github_data.get("profile", {}).get("public_repos"),
        "contributions_last_year": github_data.get("profile", {}).get(
            "contributions_last_year"
        ),
        "pinned_projects": github_data.get("repos", []),
        "packages": pypi_data.get("packages", []),
        "top_packages": get_top_packages(pypi_data),
    }

    return manifest


def save_manifest(manifest: dict) -> None:
    """Write manifest to disk."""
    MANIFEST_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(MANIFEST_JSON_PATH, "w") as f:
        json.dump(manifest, f, indent=2)


def main():
    print("=" * 50)
    print("📦 Generating manifest.json")
    print("=" * 50)

    manifest = generate_manifest()
    save_manifest(manifest)

    print(f"\n✅ Manifest saved: {MANIFEST_JSON_PATH}")
    print(f"   Contributions (last year): {manifest['contributions_last_year']}")
    print(f"   Pinned projects: {len(manifest['pinned_projects'])}")
    print(f"   Top packages: {len(manifest['top_packages'])}")
    for pkg in manifest["top_packages"]:
        print(f"     • {pkg['name']}: {pkg['total_downloads']:,} downloads")

    print("=" * 50)


if __name__ == "__main__":
    main()
