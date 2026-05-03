#!/usr/bin/env python3
"""
Scrape GitHub profile for pinned repositories, profile stats, and contribution
count, then sync everything to a local JSON file via the GitHub REST API.
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

# Configuration
DATA_DIR = Path("static/data")
OUTPUT_FILE = DATA_DIR / "github.json"

# GitHub API
API_BASE = "https://api.github.com"
HEADERS = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "TechBend-Sync/1.0",
}


def get_pinned_repos(username: str) -> list[tuple[str, str]]:
    """
    Scrape a GitHub profile page for pinned repositories.
    Returns a list of (owner, repo) tuples.
    """
    url = f"https://github.com/{username}"
    resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=30)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    pinned_items = soup.select(".js-pinned-item-list-item")

    repos: list[tuple[str, str]] = []
    for item in pinned_items:
        link = item.select_one("a[href^='/']")
        if not link:
            continue

        href = link["href"].strip("/")
        parts = href.split("/")
        if len(parts) == 2:
            repos.append((parts[0], parts[1]))

    return repos


def fetch_repo(owner: str, repo: str) -> dict | None:
    """Fetch a single repository from the GitHub REST API."""
    url = f"{API_BASE}/repos/{owner}/{repo}"
    resp = requests.get(url, headers=HEADERS, timeout=30)
    if resp.status_code == 404:
        print(f"  ⚠ Repo not found: {owner}/{repo}")
        return None
    resp.raise_for_status()
    return resp.json()


def fetch_user_profile(username: str) -> dict:
    """Fetch user profile metadata from the GitHub REST API."""
    url = f"{API_BASE}/users/{username}"
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    return resp.json()


def fetch_contribution_count(username: str) -> int | None:
    """Scrape the GitHub contributions page for last-year contribution count."""
    url = f"https://github.com/users/{username}/contributions"
    resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=30)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    h2 = soup.find("h2", id="js-contribution-activity-description")
    if not h2:
        return None

    text = h2.get_text(strip=True)
    match = re.search(r"(\d+)", text)
    return int(match.group(1)) if match else None


def build_repo_summary(raw: dict) -> dict:
    """Extract only the fields we need from a GitHub repo response."""
    return {
        "name": raw["name"],
        "full_name": raw["full_name"],
        "owner": raw["owner"]["login"],
        "html_url": raw["html_url"],
        "description": raw.get("description") or "No description available.",
        "language": raw.get("language"),
        "stargazers_count": raw.get("stargazers_count", 0),
        "forks_count": raw.get("forks_count", 0),
        "open_issues_count": raw.get("open_issues_count", 0),
        "topics": raw.get("topics", []),
        "homepage": raw.get("homepage") or "",
        "created_at": raw.get("created_at"),
        "updated_at": raw.get("updated_at"),
        "archived": raw.get("archived", False),
        "fork": raw.get("fork", False),
    }


def main():
    print("=" * 50)
    print("🔍 GitHub Profile Sync")
    print("=" * 50)

    DATA_DIR.mkdir(exist_ok=True)

    username = "tavallaie"

    # Profile metadata
    print(f"\n👤 Fetching profile for: {username}")
    profile = fetch_user_profile(username)
    print(f"   Public repos: {profile.get('public_repos')}")
    print(f"   Followers: {profile.get('followers')}")

    # Contribution count
    print(f"\n📊 Fetching contribution count...")
    contributions = fetch_contribution_count(username)
    if contributions is not None:
        print(f"   Contributions (last year): {contributions}")
    else:
        print(f"   ⚠ Could not parse contribution count")

    # Pinned repos
    print(f"\n🔎 Scraping pinned repos...")
    pinned = get_pinned_repos(username)
    print(f"   Found: {', '.join(f'{o}/{r}' for o, r in pinned)}")

    # Fetch metadata for each pinned repo
    repos: list[dict] = []
    print(f"\n📦 Fetching repository metadata...")
    for owner, repo_name in pinned:
        print(f"   → {owner}/{repo_name}")
        try:
            raw = fetch_repo(owner, repo_name)
            if raw:
                repos.append(build_repo_summary(raw))
                print(f"     ✓ {raw.get('stargazers_count', 0)} stars")
        except Exception as e:
            print(f"     ✗ Error: {e}")
            continue

    total_stars = sum(r["stargazers_count"] for r in repos)

    # Build output
    output = {
        "username": username,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "profile": {
            "public_repos": profile.get("public_repos"),
            "followers": profile.get("followers"),
            "following": profile.get("following"),
            "created_at": profile.get("created_at"),
            "avatar_url": profile.get("avatar_url"),
            "html_url": profile.get("html_url"),
            "contributions_last_year": contributions,
        },
        "repo_count": len(repos),
        "total_stars": total_stars,
        "repos": repos,
    }

    with open(OUTPUT_FILE, "w") as f:
        json.dump(output, f, indent=2)

    print(f"\n💾 Saved to {OUTPUT_FILE}")
    print(f"   Repositories: {output['repo_count']}")
    print(f"   Total stars: {total_stars:,}")
    print(f"   Contributions (last year): {contributions or 'N/A'}")

    print("\n" + "=" * 50)
    print("✅ Sync complete!")
    print("=" * 50)


if __name__ == "__main__":
    main()
