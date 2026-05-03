"""
Scrape PyPI user page to discover all packages.
"""

import requests
from bs4 import BeautifulSoup


def get_pypi_packages(username: str) -> list[str]:
    """
    Scrape PyPI user page for package names.
    Returns sorted list of unique package names.
    """
    url = f"https://pypi.org/user/{username}/"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.0"
    }

    resp = requests.get(url, headers=headers, timeout=30)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    packages = set()

    # PyPI user page structure: packages are in <a> tags with class containing package name
    for link in soup.find_all("a", href=True):
        href = link["href"]
        # Package links look like /project/package-name/
        if href.startswith("/project/") and href.count("/") == 2:
            pkg_name = href.replace("/project/", "").rstrip("/")
            if pkg_name and pkg_name != username:
                packages.add(pkg_name)

    # Also check for package-snippet class (alternative PyPI layout)
    for snippet in soup.select("a.package-snippet"):
        href = snippet.get("href", "")
        if href.startswith("/project/"):
            pkg_name = href.replace("/project/", "").rstrip("/")
            if pkg_name:
                packages.add(pkg_name)

    return sorted(packages)


if __name__ == "__main__":
    packages = get_pypi_packages("tavallaie")
    print(f"Found {len(packages)} packages:")
    for pkg in packages:
        print(f"  - {pkg}")
