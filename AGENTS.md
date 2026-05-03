# AGENTS.md — TechBend Developer Portal

This file is the canonical reference for AI coding agents working on this repository. The project is a static personal developer portfolio and open-source showcase for Ali Tavallaie, deployed at `https://techbend.dev`.

---

## Project Overview

This repository produces a Hugo-based static site that serves as:

- A personal portfolio and developer landing page
- A live dashboard of open-source Python packages published to PyPI
- A showcase of technical books and writing
- A contact and booking hub (via Cal.com)

The site is split into two distinct systems:

1. **Hugo Static Site** (`content/`, `themes/`, `layouts/`, `public/`)
2. **Python Data Pipeline** (`scripts/`, `data/`) — syncs PyPI download statistics from BigQuery

There is no backend server at runtime; everything is either pre-built static HTML or client-side JavaScript fetching public APIs.

---

## Technology Stack

| Layer | Technology | Version / Notes |
|-------|-----------|-----------------|
| Static Site Generator | Hugo (Extended) | `0.125.0` (pinned in CI) |
| Styling | SCSS | Compiled by Hugo's built-in Sass pipeline |
| Frontend JS | Vanilla JavaScript | No frameworks, no build step beyond minification |
| Python | CPython | `>=3.12` (specified in `pyproject.toml` and CI) |
| Python Package Manager | `uv` | `uv.lock` present; virtualenv at `.venv/` |
| Data Source | BigQuery Public Data | `bigquery-public-data.pypi.file_downloads` |
| Hosting | GitHub Pages | Deployed via GitHub Actions |

**Notably absent:** Node.js, npm, Docker, test frameworks, CSS frameworks (Bootstrap/Tailwind), or JS frameworks (React/Vue).

---

## Directory Structure

```
├── archetypes/           # Hugo archetypes (empty)
├── assets/               # Project-level assets (empty; theme owns all assets)
├── content/              # Markdown content pages
│   ├── about.md
│   ├── contact.md
│   ├── packages.md       # Front-matter only; uses custom layout
│   ├── projects.md
│   ├── resume.md
│   └── books/
│       └── _index.md
├── data/                 # PyPI statistics — JSON + CSV per package + manifest.json
├── env/                  # GCP service account key (local development only)
├── layouts/              # Project-level Hugo layouts (empty; theme provides all)
├── public/               # Hugo build output (generated; do not commit)
├── resources/            # Hugo resource cache (SCSS → CSS, etc.)
├── scripts/              # Python automation
│   ├── discover_packages.py
│   └── sync_stats.py
├── static/               # Static files served directly (empty at project level)
├── themes/techbend/      # Custom Hugo theme (all layouts, SCSS, JS)
│   ├── assets/
│   │   ├── css/main.scss
│   │   └── js/main.js
│   ├── layouts/
│   │   ├── _default/
│   │   │   ├── baseof.html
│   │   │   ├── list.html
│   │   │   └── single.html
│   │   ├── index.html
│   │   ├── packages/single.html
│   │   └── partials/
│   │       ├── header.html
│   │       └── footer.html
│   └── theme.toml
├── .github/workflows/    # CI/CD definitions
│   ├── hugo.yml          # Build and deploy to GitHub Pages
│   └── sync-pypi.yml     # Daily PyPI stats sync
├── hugo.toml             # Hugo site configuration
├── pyproject.toml        # Python project metadata and dependencies
└── uv.lock               # Locked Python dependency tree
```

---

## Build and Run Commands

### Hugo Site

**Prerequisite:** Hugo Extended `0.125.0` (or compatible). Download from [gohugoio/hugo/releases](https://github.com/gohugoio/hugo/releases).

```bash
# Start local development server with live reload
hugo server -D

# Build production site (outputs to ./public)
hugo --gc --minify

# Build with explicit baseURL
hugo --gc --minify --baseURL "https://techbend.dev/"
```

- `--gc` — cleans up unused cached resources
- `--minify` — minifies HTML, CSS, JS, JSON
- `-D` — includes draft content (dev only)

### Python Scripts

**Prerequisite:** Python 3.12 and `uv` (or `pip` with `pyproject.toml`).

```bash
# Install dependencies (using uv)
uv sync

# Or using pip
pip install -e .

# Activate virtualenv
source .venv/bin/activate

# Discover packages on PyPI
python scripts/discover_packages.py

# Sync PyPI download stats from BigQuery
python scripts/sync_stats.py
```

**Environment variable required for BigQuery:**
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/gcp-service-account.json
```

A local service account key exists at `env/techbend-89ea5a3e24a2.json` for development. This file is **gitignored** and must never be committed.

---

## Code Style Guidelines

### Hugo Templates

- Use Go template syntax consistently: `{{ .Variable }}`
- Indent with 2 spaces inside templates
- Use `{{ if .Site.Params.showX }}` pattern for conditional sections
- Prefer `where` and `first` for page queries (e.g., `{{ range first 3 (where .Site.RegularPages "Section" "books") }}`)
- External menu links are detected with `hasPrefix .URL "http"` and receive `target="_blank" rel="noopener"`
- Active nav state uses `$.IsMenuCurrent "main" .`

### SCSS

- Single-file architecture: all styles live in `themes/techbend/assets/css/main.scss`
- CSS custom properties (variables) are defined on `:root` for the dark theme
- BEM-like naming for component classes (e.g., `.hero-section`, `.pypi-grid`, `.stat-card`)
- Mobile breakpoint is fixed at `768px`
- The theme is dark-first; light mode toggling is handled by JavaScript setting `data-theme="light"` on `<html>`

### JavaScript

- Single-file architecture: all client JS lives in `themes/techbend/assets/js/main.js`
- Modular by function: each feature has an `init*` or `fetch*` function
- Uses `DOMContentLoaded` event for initialization
- Fetches public APIs: GitHub API, PyPI JSON API, and local `/data/manifest.json`
- No external JS libraries are loaded

### Python

- Follows PEP 8 with some project conventions:
  - Type hints used for function signatures (e.g., `def get_pypi_packages(username: str) -> list[str]`)
  - Docstrings are concise and descriptive
  - `UPPER_SNAKE_CASE` for module-level constants
  - `snake_case` for functions and variables
  - Uses `pathlib.Path` for filesystem operations
  - Uses `datetime.now(timezone.utc)` for timezone-aware timestamps

---

## Testing Instructions

**There are no automated tests in this project.** There is no `pytest`, `unittest`, or `tox` configuration.

Manual verification steps:

1. Run `hugo server -D` and visually inspect the site at `http://localhost:1313`
2. Check browser console for JS errors after page load
3. Verify theme toggle works (dark ↔ light)
4. Verify mobile menu opens/closes at viewport width `< 768px`
5. Run `python scripts/discover_packages.py` and confirm it returns the expected package list
6. Run `python scripts/sync_stats.py` (with valid GCP credentials) and verify JSON/CSV files are written to `data/`

---

## Data Pipeline (PyPI Stats Sync)

The Python scripts form a small ETL pipeline:

```
discover_packages.py          sync_stats.py
       │                            │
       ▼                            ▼
Scrape PyPI user page     Query BigQuery public dataset
for package names         (pypi.file_downloads)
       │                            │
       └────────────┬───────────────┘
                    ▼
            data/{package}.json
            data/{package}.csv
                    │
                    ▼
            data/manifest.json
```

- `discover_packages.py` scrapes `https://pypi.org/user/tavallaie/` using `requests` + `BeautifulSoup`
- `sync_stats.py` queries `bigquery-public-data.pypi.file_downloads` with date-range chunking (max 6 months per query, 2 years of history)
- Output columns: `day`, `version`, `system`, `python_version`, `installer`, `downloads`
- `manifest.json` aggregates totals and date ranges per package

This pipeline runs automatically via `.github/workflows/sync-pypi.yml` every day at 06:00 UTC.

---

## Deployment

### GitHub Pages (Primary)

Triggered by: push to `main` or manual `workflow_dispatch`.

Workflow: `.github/workflows/hugo.yml`

1. Install Hugo Extended `0.125.0` on `ubuntu-latest`
2. Checkout with `submodules: recursive` and `fetch-depth: 0`
3. Configure GitHub Pages
4. Build: `hugo --gc --minify --baseURL <pages-url>`
5. Upload `./public` as artifact
6. Deploy via `actions/deploy-pages@v4`

### PyPI Stats Sync (Automated)

Triggered by: cron `0 6 * * *` (daily 6 AM UTC) or manual dispatch.

Workflow: `.github/workflows/sync-pypi.yml`

1. Set up Python 3.12
2. Install BigQuery dependencies via `pip`
3. Write GCP service account key from `secrets.GCP_SA_KEY` to `/tmp/gcp-key.json`
4. Run `python scripts/sync_stats.py`
5. Clean up credentials (runs `always()`)
6. Commit and push changes in `data/` directory with bot identity

---

## Security Considerations

- **GCP Service Account Key:** The local file `env/techbend-89ea5a3e24a2.json` is excluded from Git via `.gitignore`. In CI, the key is written from `secrets.GCP_SA_KEY` and deleted in an `always()` step.
- **No Server-Side Execution:** The deployed site is purely static HTML/CSS/JS. There is no server-side code running in production.
- **Client-Side API Calls:** JavaScript calls public APIs (GitHub API, PyPI API) from the user's browser. No API keys are exposed in frontend code.
- **Subresource Integrity:** Hugo's asset pipeline generates SRI hashes for CSS and JS in `baseof.html`.
- **External Links:** All external menu links receive `rel="noopener"` to prevent `window.opener` exploits.
- **No User Input Forms:** The contact page uses static cards/links. There is no active Formspree configuration (`formspreeId` is empty in `hugo.toml`).

---

## Theme Development Notes

- The custom theme is named `techbend` and lives entirely under `themes/techbend/`
- There are no project-level layout overrides in `/layouts/`
- The `packages` content page (`content/packages.md`) uses a custom layout via front matter: `layout: "packages"`, which maps to `themes/techbend/layouts/packages/single.html`
- The homepage (`layouts/index.html`) is the most complex template; it includes server-side skeleton HTML that is hydrated by client-side JavaScript
- Assets are processed through Hugo pipelines:
  - SCSS: `resources.Get "css/main.scss" | css.Sass | resources.Minify | fingerprint`
  - JS: `resources.Get "js/main.js" | resources.Minify | fingerprint`
- Site parameters are exposed to JavaScript via an inline script in `baseof.html` (e.g., `window.GITHUB_USER`, `window.PYPI_USER`)
- `theme.toml` specifies `min_version = "0.118.0"` for Hugo compatibility

---

## Key Configuration Reference

### `hugo.toml`

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `baseURL` | `https://techbend.dev` | Production domain |
| `theme` | `techbend` | Custom theme directory name |
| `params.github` | `tavallaie` | GitHub username for API calls |
| `params.githubOrg` | `techbend` | GitHub org name |
| `params.pypiUser` | `tavallaie` | PyPI username for scraping |
| `params.calLink` | `https://cal.com/tavallaie` | Cal.com booking URL |
| `params.sponsorLink` | `https://github.com/sponsors/tavallaie` | GitHub Sponsors URL |
| `params.blogLink` | `https://blog.techbend.dev` | External blog link |
| `params.showGithub` | `true` | Toggle GitHub sections |
| `params.showPyPI` | `true` | Toggle PyPI sections |
| `params.showBooks` | `true` | Toggle books section |
| `params.showResume` | `true` | Toggle resume page |
| `params.showContact` | `true` | Toggle contact page |
| `params.showSponsor` | `true` | Toggle sponsor button |
| `params.showCalendar` | `true` | Toggle calendar/booking button |

### `pyproject.toml`

Python dependencies:
- `beautifulsoup4>=4.14.3`
- `db-dtypes>=1.5.1`
- `google-cloud-bigquery>=3.41.0`
- `pandas>=2.3.3`
- `requests>=2.33.1`

---

## Common Tasks for Agents

**Add a new section to the homepage:** Edit `themes/techbend/layouts/index.html` inside the `{{ define "main" }}` block. Follow the existing pattern of conditional rendering with `{{ if .Site.Params.showX }}`.

**Add a new content page:** Create a Markdown file in `content/` with front matter. It will automatically use `themes/techbend/layouts/_default/single.html` unless a custom layout is specified.

**Modify styles:** Edit `themes/techbend/assets/css/main.scss`. The Hugo dev server will live-reload SCSS changes.

**Modify client-side behavior:** Edit `themes/techbend/assets/js/main.js`. The file is organized into discrete initialization functions called from a single `DOMContentLoaded` listener.

**Add or update PyPI package tracking:** The package list is dynamically discovered by scraping the PyPI user page. No manual configuration is needed. If a package is missing, verify it appears on `https://pypi.org/user/tavallaie/` and re-run `sync_stats.py`.

**Update Hugo version:** Change `HUGO_VERSION` in `.github/workflows/hugo.yml` and update `min_version` in `themes/techbend/theme.toml` if necessary.

---

## Useful Links

- Hugo documentation: https://gohugo.io/documentation/
- BigQuery public PyPI dataset: https://console.cloud.google.com/marketplace/product/gcp-public-data-pypi
- PyPI JSON API: https://docs.pypi.org/api/json/
- GitHub API (users/repos): https://docs.github.com/en/rest/repos/repos#list-repositories-for-a-user
