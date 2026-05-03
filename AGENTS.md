<!-- From: /home/ali/projects/techbend.github.io/AGENTS.md -->
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
2. **Python Data Pipeline** (`scripts/`, `static/data/`) — syncs PyPI download statistics from BigQuery

There is no backend server at runtime; everything is either pre-built static HTML or client-side JavaScript fetching public APIs.

---

## Technology Stack

| Layer | Technology | Version / Notes |
|-------|-----------|-----------------|
| Static Site Generator | Hugo (Extended) | `0.125.0` (pinned in CI) |
| CSS Architecture | Custom CSS | Modular files: tokens, base, layout, components, effects |
| CSS Features | Modern CSS | `@layer`, `@property`, CSS variables, `backdrop-filter`, container queries |
| Frontend JS | Vanilla JavaScript | No frameworks, no build step beyond minification |
| Python | CPython | `>=3.12` (specified in `pyproject.toml` and CI) |
| Python Package Manager | `uv` | `uv.lock` present; virtualenv at `.venv/` |
| Data Source | BigQuery Public Data | `bigquery-public-data.pypi.file_downloads` |
| Hosting | GitHub Pages | Deployed via GitHub Actions |

**Notably absent:** Node.js, npm, Docker, test frameworks, or JS frameworks (React/Vue).

> **Note on CSS Architecture:** The theme uses a fully custom CSS design system with no external CSS frameworks. Styles are split into logical modules (tokens, base, layout, components, effects) and concatenated via Hugo's `resources.Concat`. This provides complete creative control while keeping the build dependency-free.

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
├── static/data/          # Generated data files
│   ├── github.json       # GitHub profile & pinned repos
│   ├── pypi.json         # PyPI package manifest
│   └── pypi/             # Per-package JSON + CSV stats
├── env/                  # GCP service account key (local development only)
├── layouts/              # Project-level Hugo layouts (empty; theme provides all)
├── public/               # Hugo build output (generated; do not commit)
├── resources/            # Hugo resource cache
├── scripts/              # Python automation
│   ├── discover_packages.py
│   └── sync_stats.py
├── static/               # Static files served directly (empty at project level)
├── themes/techbend/      # Custom Hugo theme (modular, DaisyUI-based)
│   ├── assets/
│   │   ├── css/
│   │   │   ├── reset.css         # Modern CSS reset
│   │   │   ├── tokens.css        # Design tokens (colors, spacing, typography)
│   │   │   ├── base.css          # Base styles, typography, selection
│   │   │   ├── layout.css        # Containers, grids, utilities
│   │   │   ├── components.css    # Nav, buttons, cards, footer, forms, prose
│   │   │   └── effects.css       # Aurora, glow, animations, spotlight, typewriter
│   │   └── js/main.js            # Client-side interactions & data fetching
│   ├── layouts/
│   │   ├── _default/
│   │   │   ├── baseof.html       # Root layout
│   │   │   ├── list.html         # List pages (books, etc.)
│   │   │   └── single.html       # Single content pages
│   │   ├── index.html            # Homepage (composes partials)
│   │   ├── packages/
│   │   │   └── single.html       # Packages listing page
│   │   └── partials/             # Modular reusable components
│   │       ├── head.html         # CSS concat via Hugo pipeline
│   │       ├── header.html       # Fixed nav with scroll blur
│   │       ├── footer.html       # Dynamic footer columns
│   │       ├── hero.html         # Full-viewport hero with aurora
│   │       └── sections/         # Homepage sections
│   │           ├── github.html
│   │           ├── pypi.html
│   │           ├── activity.html
│   │           ├── books.html
│   │           └── booking.html
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
- **Modular architecture:** The homepage (`index.html`) should only compose partials; no direct markup. Each section lives in `partials/sections/`.
- **No hardcoded text:** All user-facing strings must come from `.Site.Params` or content front matter.

### CSS (Custom Design System)

- **No external CSS frameworks.** All styles are hand-crafted in `themes/techbend/assets/css/`.
- The CSS is split into 6 modules and concatenated via Hugo's `resources.Concat`:
  1. `reset.css` — minimal modern reset
  2. `tokens.css` — CSS custom properties for colors, spacing, typography, radii, shadows
  3. `base.css` — body, headings, links, scrollbar, selection
  4. `layout.css` — containers, grids, flex utilities, responsive breakpoints
  5. `components.css` — nav, buttons, cards, badges, footer, forms, prose content
  6. `effects.css` — aurora blobs, gradient text, spotlight hover, glow borders, reveal animations, shimmer skeletons, typewriter
- Both `light` and `dark` themes are defined as complete token sets on `[data-theme="dark"]` and `[data-theme="light"]`.
- Use CSS variables (`var(--bg)`, `var(--accent)`, etc.) for all colors and metrics.
- Mobile breakpoint is at `768px`.
- The `spotlight-card` class creates a radial gradient that follows the cursor on hover.

### JavaScript

- Single-file architecture: all client JS lives in `themes/techbend/assets/js/main.js`
- Modular by function: each feature has an `init*` or `fetch*` function
- Uses `DOMContentLoaded` event for initialization
- Fetches public APIs: GitHub API, PyPI JSON API, and local `/data/pypi.json` (served from `static/data/')
- Theme toggle is a custom button that swaps `data-theme` between `dark` and `light`
- Mobile menu toggles the `.open` class on `#mobileNav`
- Scroll-triggered nav blur adds `.scrolled` to `#siteNav` when `scrollY > 20`

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
4. Verify mobile menu opens/closes at viewport width `< 1024px` (DaisyUI `lg:` breakpoint)
5. Run `python scripts/discover_packages.py` and confirm it returns the expected package list
6. Run `python scripts/sync_stats.py` (with valid GCP credentials) and verify JSON/CSV files are written to `static/data/`

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
            static/data/pypi/{package}.json
            static/data/pypi/{package}.csv
                    │
                    ▼
            static/data/pypi.json
```

- `discover_packages.py` scrapes `https://pypi.org/user/tavallaie/` using `requests` + `BeautifulSoup`
- `sync_stats.py` queries `bigquery-public-data.pypi.file_downloads` with smart incremental sync: discovers each package's first/last download date, then on subsequent runs only fetches new days
- Output columns: `day`, `version`, `system`, `python_version`, `installer`, `downloads`
- `pypi.json` aggregates totals and date ranges per package

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
6. Commit and push changes in `static/data/` directory with bot identity

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
- The homepage (`layouts/index.html`) is a composition of partials only; it includes no direct markup
- Custom assets are processed through Hugo pipelines:
  - CSS: 6 files are concatenated via `resources.Concat`, then minified and fingerprinted:
    ```go
    {{ $css := slice $reset $tokens $base $layout $components $effects
        | resources.Concat "css/main.css"
        | resources.Minify
        | fingerprint }}
    ```
  - JS: `resources.Get "js/main.js" | resources.Minify | fingerprint`
- Site parameters are exposed to JavaScript via an inline script in `partials/scripts.html` (e.g., `window.GITHUB_USER`, `window.PYPI_USER`)
- `theme.toml` specifies `min_version = "0.118.0"` for Hugo compatibility
- **Light/Dark mode:** Controlled by `data-theme` attribute on `<html>`. DaisyUI provides both palettes. A `swap` checkbox with `theme-controller` class handles toggling, backed by `localStorage`.

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
| `params.hero.name` | `Ali Tavallaie` | Hero section name |
| `params.hero.subtitle` | `...` | Hero subtitle text |
| `params.hero.statusText` | `Available for consulting` | Status badge text |
| `params.hero.statusColor` | `success` | DaisyUI badge color for status |
| `params.sections.*.title` | various | Section headings |
| `params.footer.columns` | array | Footer link columns (dynamic) |
| `params.contact.cards` | array | Contact page cards (dynamic) |

### `pyproject.toml`

Python dependencies:
- `beautifulsoup4>=4.14.3`
- `db-dtypes>=1.5.1`
- `google-cloud-bigquery>=3.41.0`
- `pandas>=2.3.3`
- `requests>=2.33.1`

---

## Common Tasks for Agents

**Add a new section to the homepage:**
1. Create a new partial in `themes/techbend/layouts/partials/sections/my-section.html`
2. Add corresponding params to `hugo.toml` under `[params.sections.mySection]`
3. Include the partial in `themes/techbend/layouts/index.html`

**Add a new content page:** Create a Markdown file in `content/` with front matter. It will automatically use `themes/techbend/layouts/_default/single.html` unless a custom layout is specified.

**Modify styles:** Edit `themes/techbend/assets/css/main.css`. Only add styles for JS-injected components or prose content. For layout, spacing, colors, and UI components, use DaisyUI/Tailwind classes directly in templates.

**Modify client-side behavior:** Edit `themes/techbend/assets/js/main.js`. The file is organized into discrete initialization functions called from a single `DOMContentLoaded` listener.

**Add or update PyPI package tracking:** The package list is dynamically discovered by scraping the PyPI user page. No manual configuration is needed. If a package is missing, verify it appears on `https://pypi.org/user/tavallaie/` and re-run `sync_stats.py`.

**Update Hugo version:** Change `HUGO_VERSION` in `.github/workflows/hugo.yml` and update `min_version` in `themes/techbend/theme.toml` if necessary.

**Change theme colors:** Edit `themes/techbend/assets/css/tokens.css`. Both `[data-theme="dark"]` and `[data-theme="light"]` have complete token sets. Modify any `--*` variable to change colors, spacing, or shadows across the entire site.

---

## Useful Links

- Hugo documentation: https://gohugo.io/documentation/
- DaisyUI documentation: https://daisyui.com/
- Tailwind CSS documentation: https://tailwindcss.com/
- BigQuery public PyPI dataset: https://console.cloud.google.com/marketplace/product/gcp-public-data-pypi
- PyPI JSON API: https://docs.pypi.org/api/json/
- GitHub API (users/repos): https://docs.github.com/en/rest/repos/repos#list-repositories-for-a-user
