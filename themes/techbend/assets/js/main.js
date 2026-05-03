document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initMobileMenu();
    fetchGitHubPinned();
    fetchPyPITop6();
    fetchGitHubActivity();
    fetchHeroStats();
});

// Theme Toggle
function initThemeToggle() {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;

    const updateIcon = () => {
        const theme = document.documentElement.getAttribute('data-theme');
        toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    };

    toggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        updateIcon();
    });

    updateIcon();
}

// Mobile Menu
function initMobileMenu() {
    const toggle = document.getElementById('mobileMenuToggle');
    const nav = document.getElementById('mainNav');
    if (!toggle || !nav) return;

    toggle.addEventListener('click', () => {
        nav.classList.toggle('open');
        const isOpen = nav.classList.contains('open');
        toggle.setAttribute('aria-expanded', isOpen);
    });
}

// GitHub Pinned Repos
async function fetchGitHubPinned() {
    const container = document.getElementById('githubPinned');
    if (!container) return;

    const username = window.GITHUB_USER || 'tavallaie';

    try {
        // GitHub API doesn't expose pinned repos directly, so we fetch top repos by stars
        const response = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=6`);
        if (!response.ok) throw new Error('GitHub API error');

        const repos = await response.json();

        const cards = repos.slice(0, 6).map(repo => `
      <div class="repo-card">
        <div class="repo-header">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/></svg>
          <h3><a href="${repo.html_url}" target="_blank" rel="noopener">${repo.name}</a></h3>
        </div>
        <p class="repo-desc">${repo.description || 'No description available.'}</p>
        <div class="repo-meta">
          ${repo.language ? `<span class="repo-lang"><span class="lang-dot" style="background:${getLangColor(repo.language)}"></span>${repo.language}</span>` : ''}
          <span class="repo-stars">⭐ ${repo.stargazers_count}</span>
          <span class="repo-forks">🔀 ${repo.forks_count}</span>
        </div>
      </div>
    `).join('');

        container.innerHTML = cards;

    } catch (error) {
        console.error('GitHub pinned error:', error);
        container.innerHTML = `<div class="error-state" style="grid-column:1/-1;"><p>Unable to load repos. <a href="https://github.com/${username}" target="_blank">View on GitHub →</a></p></div>`;
    }
}

function getLangColor(lang) {
    const colors = { Python: '#3572A5', JavaScript: '#f1e05a', TypeScript: '#2b7489', HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051', Rust: '#dea584', Go: '#00ADD8' };
    return colors[lang] || '#8b949e';
}

// PyPI Top 6
async function fetchPyPITop6() {
    const container = document.getElementById('pypiTop6');
    if (!container) return;

    try {
        const manifestResp = await fetch('/data/manifest.json');
        let packages = [];

        if (manifestResp.ok) {
            const manifest = await manifestResp.json();
            packages = manifest.packages || [];
            // Sort by downloads desc, take top 6
            packages.sort((a, b) => (b.total_downloads || 0) - (a.total_downloads || 0));
            packages = packages.slice(0, 6);
        }

        if (packages.length === 0) {
            container.innerHTML = '<p class="empty-state">No packages found.</p>';
            return;
        }

        const cards = await Promise.all(packages.map(async (pkg) => {
            const pkgName = typeof pkg === 'string' ? pkg : pkg.name;
            const totalDownloads = typeof pkg === 'object' ? pkg.total_downloads : null;
            return await fetchPackageCard(pkgName, totalDownloads);
        }));

        container.innerHTML = cards.filter(c => c).join('');

    } catch (error) {
        console.error('PyPI top 6 error:', error);
        container.innerHTML = '<div class="error-state" style="grid-column:1/-1;"><p>Unable to load packages.</p></div>';
    }
}

// All Packages Page
async function fetchAllPackages() {
    const container = document.getElementById('packagesAll');
    const totalEl = document.getElementById('packagesTotal');
    const searchInput = document.getElementById('packageSearch');
    const sortSelect = document.getElementById('packageSort');
    if (!container) return;

    try {
        const manifestResp = await fetch('/data/manifest.json');
        let packages = [];

        if (manifestResp.ok) {
            const manifest = await manifestResp.json();
            packages = manifest.packages || [];
        }

        totalEl.textContent = `${packages.length} packages total`;

        const render = async () => {
            let filtered = [...packages];
            const search = searchInput?.value.toLowerCase() || '';
            const sort = sortSelect?.value || 'downloads';

            if (search) filtered = filtered.filter(p => (typeof p === 'string' ? p : p.name).toLowerCase().includes(search));

            if (sort === 'downloads') filtered.sort((a, b) => ((typeof b === 'object' ? b.total_downloads : 0) || 0) - ((typeof a === 'object' ? a.total_downloads : 0) || 0));
            else if (sort === 'name') filtered.sort((a, b) => (typeof a === 'string' ? a : a.name).localeCompare(typeof b === 'string' ? b : b.name));

            const cards = await Promise.all(filtered.map(async (pkg) => {
                const pkgName = typeof pkg === 'string' ? pkg : pkg.name;
                const totalDownloads = typeof pkg === 'object' ? pkg.total_downloads : null;
                return await fetchPackageCard(pkgName, totalDownloads, true);
            }));

            container.innerHTML = cards.filter(c => c).join('') || '<p class="empty-state">No packages match your search.</p>';
        };

        await render();

        searchInput?.addEventListener('input', render);
        sortSelect?.addEventListener('change', render);

    } catch (error) {
        console.error('All packages error:', error);
        container.innerHTML = '<div class="error-state" style="grid-column:1/-1;"><p>Unable to load packages.</p></div>';
    }
}

async function fetchPackageCard(packageName, knownDownloads = null, showDetails = false) {
    try {
        const response = await fetch(`https://pypi.org/pypi/${packageName}/json`);
        if (!response.ok) return null;

        const data = await response.json();
        const info = data.info;
        const downloads = knownDownloads !== null ? formatNumber(knownDownloads) : '—';

        return `
      <div class="pypi-card">
        <div class="pypi-header">
          <h3><a href="https://pypi.org/project/${packageName}/" target="_blank" rel="noopener">${packageName}</a></h3>
          <span class="pypi-version">v${info.version}</span>
        </div>
        <p class="pypi-desc">${info.summary || 'No description available.'}</p>
        ${showDetails ? `<div class="pypi-stats"><span>🐍 ${info.requires_python || 'Any'}</span><span>📅 ${info.version}</span></div>` : ''}
        <div class="pypi-downloads">
          <span class="download-count">${downloads}</span>
          <span class="download-label">total downloads</span>
        </div>
      </div>
    `;
    } catch (error) {
        return null;
    }
}

// GitHub Activity
async function fetchGitHubActivity() {
    const container = document.getElementById('githubActivity');
    if (!container) return;

    const username = window.GITHUB_USER || 'tavallaie';

    try {
        const response = await fetch(`https://api.github.com/users/${username}/events/public?per_page=10`);
        if (!response.ok) throw new Error('GitHub API error');

        const events = await response.json();

        const activityHTML = events
            .filter(e => ['PushEvent', 'CreateEvent', 'ReleaseEvent', 'IssuesEvent', 'PullRequestEvent'].includes(e.type))
            .slice(0, 5)
            .map(event => {
                const icons = { PushEvent: '⬆️', CreateEvent: '🆕', ReleaseEvent: '🚀', IssuesEvent: '🐛', PullRequestEvent: '🔀' };
                const labels = { PushEvent: 'Pushed to', CreateEvent: 'Created', ReleaseEvent: 'Released', IssuesEvent: 'Issue in', PullRequestEvent: 'PR in' };
                const repoName = event.repo.name.replace(`${username}/`, '');
                const timeAgo = getTimeAgo(new Date(event.created_at));
                let desc = '';
                if (event.type === 'PushEvent') {
                    const commits = event.payload.commits || [];
                    desc = commits.length > 1 ? `${commits.length} commits` : (commits[0]?.message || '');
                    if (desc.length > 60) desc = desc.substring(0, 60) + '...';
                }
                return `
          <div class="activity-item">
            <div class="activity-icon">${icons[event.type] || '⚡'}</div>
            <div class="activity-content">
              <div class="activity-title">${labels[event.type] || 'Activity in'} <a href="https://github.com/${event.repo.name}" target="_blank" rel="noopener">${repoName}</a></div>
              ${desc ? `<div class="activity-desc">${desc}</div>` : ''}
              <div class="activity-meta">${timeAgo}</div>
            </div>
          </div>
        `;
            }).join('');

        container.innerHTML = activityHTML || '<p class="empty-state">No recent public activity.</p>';

    } catch (error) {
        container.innerHTML = `<div class="error-state"><p>Unable to load activity. <a href="https://github.com/${username}" target="_blank">View on GitHub →</a></p></div>`;
    }
}

// Hero Stats
async function fetchHeroStats() {
    const container = document.getElementById('heroStats');
    if (!container) return;

    const username = window.GITHUB_USER || 'tavallaie';

    try {
        const [githubResp, pypiResp] = await Promise.all([
            fetch(`https://api.github.com/users/${username}`),
            fetch('/data/manifest.json').catch(() => null)
        ]);

        const github = githubResp.ok ? await githubResp.json() : {};
        let totalDownloads = 0, packageCount = 0;

        if (pypiResp && pypiResp.ok) {
            const manifest = await pypiResp.json();
            totalDownloads = manifest.packages.reduce((s, p) => s + (p.total_downloads || 0), 0);
            packageCount = manifest.packages.length;
        }

        container.innerHTML = `
      <div class="stat-card"><div class="stat-value">${github.public_repos || '—'}</div><div class="stat-label">GitHub Repos</div></div>
      <div class="stat-card"><div class="stat-value">${packageCount || '—'}</div><div class="stat-label">PyPI Packages</div></div>
      <div class="stat-card"><div class="stat-value">${totalDownloads ? formatNumber(totalDownloads) : '—'}</div><div class="stat-label">Total Downloads</div></div>
    `;
    } catch (e) { }
}

// Utilities
function formatNumber(num) {
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
    return num.toString();
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    const intervals = { year: 31536000, month: 2592000, week: 604800, day: 86400, hour: 3600, minute: 60 };
    for (const [unit, s] of Object.entries(intervals)) {
        const i = Math.floor(seconds / s);
        if (i >= 1) return `${i} ${unit}${i > 1 ? 's' : ''} ago`;
    }
    return 'Just now';
}