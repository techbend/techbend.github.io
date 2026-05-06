"""
Scrape PyPI user page to discover all packages.

Can be run locally to update static/data/packages.json, which is then
committed to the repo. CI reads from this file instead of scraping,
avoiding Cloudflare bot protection on GitHub Actions runners.
"""

import json
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

PACKAGES_JSON_PATH = Path("static/data/packages.json")


def get_pypi_packages(username: str) -> list[str]:
    """
    Scrape PyPI user page for package names.
    Returns sorted list of unique package names.
    """
    url = f"https://pypi.org/user/{username}/"
    headers = {
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
    }

    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    packages = set()

    # PyPI user page: packages are in <a class="package-snippet" href="/project/name/">
    for snippet in soup.select("a.package-snippet"):
        href = snippet.get("href", "")
        if href.startswith("/project/"):
            pkg_name = href.replace("/project/", "").rstrip("/")
            if pkg_name:
                packages.add(pkg_name)

    return sorted(packages)


def save_packages(packages: list[str], username: str = "tavallaie") -> Path:
    """Save discovered packages to static/data/packages.json."""
    manifest = {
        "username": username,
        "discovered_at": datetime.now(timezone.utc).isoformat(),
        "package_count": len(packages),
        "packages": packages,
    }
    PACKAGES_JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(PACKAGES_JSON_PATH, "w") as f:
        json.dump(manifest, f, indent=2)
    return PACKAGES_JSON_PATH


if __name__ == "__main__":
    packages = get_pypi_packages("tavallaie")
    print(f"Found {len(packages)} packages:")
    for pkg in packages:
        print(f"  - {pkg}")

    path = save_packages(packages)
    print(f"\n💾 Saved package list to {path}")
