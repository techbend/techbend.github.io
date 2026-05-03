document.addEventListener('DOMContentLoaded', () => {
  initThemeToggle();
  initScrollNav();
  initMobileMenu();
  initRevealAnimations();
  initSpotlightCards();
  initTypewriter();
  fetchHeroStats();
  fetchGitHubPinned();
  fetchPyPITop6();
  fetchAllPackages();
  fetchGitHubActivity();
});

// ============================================
// Theme Toggle
// ============================================
function initThemeToggle() {
  const toggle = document.getElementById('themeToggle');
  const icon = document.getElementById('themeIcon');
  if (!toggle) return;

  const updateIcon = () => {
    const theme = document.documentElement.getAttribute('data-theme');
    if (icon) icon.textContent = theme === 'dark' ? '🌙' : '☀️';
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

// ============================================
// Scroll Nav Background
// ============================================
function initScrollNav() {
  const nav = document.getElementById('siteNav');
  if (!nav) return;

  const onScroll = () => {
    if (window.scrollY > 20) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ============================================
// Mobile Menu
// ============================================
function initMobileMenu() {
  const toggle = document.getElementById('mobileToggle');
  const nav = document.getElementById('mobileNav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    nav.classList.toggle('open');
    const isOpen = nav.classList.contains('open');
    toggle.setAttribute('aria-expanded', isOpen);
  });
}

// ============================================
// Reveal Animations (Intersection Observer)
// ============================================
function initRevealAnimations() {
  const reveals = document.querySelectorAll('.reveal, .stagger-children');
  if (reveals.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  reveals.forEach(el => observer.observe(el));
}

// ============================================
// Spotlight Card Effect
// ============================================
function initSpotlightCards() {
  const cards = document.querySelectorAll('.spotlight-card');

  cards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });
}

// ============================================
// Typewriter Effect
// ============================================
function initTypewriter() {
  const el = document.getElementById('typewriterText');
  if (!el) return;

  const text = el.textContent.trim();
  el.textContent = '';
  el.classList.add('typewriter');

  let i = 0;
  const speed = 30;

  function type() {
    if (i < text.length) {
      el.textContent += text.charAt(i);
      i++;
      setTimeout(type, speed);
    } else {
      setTimeout(() => {
        el.style.borderRight = 'none';
      }, 1000);
    }
  }

  // Start after a short delay
  setTimeout(type, 500);
}

// ============================================
// Hero Stats
// ============================================
async function fetchHeroStats() {
  const container = document.getElementById('heroStats');
  if (!container) return;

  const username = window.GITHUB_USER || 'tavallaie';

  try {
    const [githubResp, pypiResp] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`),
      fetch('/data/pypi.json').catch(() => null)
    ]);

    const github = githubResp.ok ? await githubResp.json() : {};
    let totalDownloads = 0, packageCount = 0;

    if (pypiResp && pypiResp.ok) {
      const manifest = await pypiResp.json();
      totalDownloads = manifest.packages.reduce((s, p) => s + (p.total_downloads || 0), 0);
      packageCount = manifest.packages.length;
    }

    container.innerHTML = `
      <div class="card card-glass" style="min-width:160px;text-align:center;">
        <div style="font-size:2rem;font-weight:700;font-family:var(--font-mono);color:var(--accent-light);margin-bottom:0.25rem;">${github.public_repos || '—'}</div>
        <div style="font-size:0.875rem;color:var(--text-muted);">GitHub Repos</div>
      </div>
      <div class="card card-glass" style="min-width:160px;text-align:center;">
        <div style="font-size:2rem;font-weight:700;font-family:var(--font-mono);color:var(--accent-light);margin-bottom:0.25rem;">${packageCount || '—'}</div>
        <div style="font-size:0.875rem;color:var(--text-muted);">PyPI Packages</div>
      </div>
      <div class="card card-glass" style="min-width:160px;text-align:center;">
        <div style="font-size:2rem;font-weight:700;font-family:var(--font-mono);color:var(--accent-cyan);margin-bottom:0.25rem;">${totalDownloads ? formatNumber(totalDownloads) : '—'}</div>
        <div style="font-size:0.875rem;color:var(--text-muted);">Total Downloads</div>
      </div>
    `;
    container.classList.add('visible');
  } catch (e) { }
}

// ============================================
// GitHub Pinned Repos
// ============================================
async function fetchGitHubPinned() {
  const container = document.getElementById('githubPinned');
  if (!container) return;

  const username = window.GITHUB_USER || 'tavallaie';

  try {
    const response = await fetch('/data/github.json');
    if (!response.ok) throw new Error('Failed to load github.json');

    const data = await response.json();
    const repos = data.repos || [];

    if (repos.length === 0) {
      container.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted);">No repositories found.</p>';
      return;
    }

    const cards = repos.map(repo => `
      <div class="card spotlight-card glow-border">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="color:var(--text-muted);flex-shrink:0;"><path fill-rule="evenodd" d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/></svg>
          <h3 style="font-family:var(--font-mono);font-size:0.95rem;">
            <a href="${repo.html_url}" target="_blank" rel="noopener" style="color:var(--text);">${repo.name}</a>
          </h3>
        </div>
        <p style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:1rem;line-height:1.5;">${repo.description || 'No description available.'}</p>
        <div style="display:flex;gap:1rem;font-size:0.8rem;color:var(--text-muted);">
          ${repo.language ? `<span style="display:flex;align-items:center;gap:0.25rem;"><span style="width:8px;height:8px;border-radius:50%;background:${getLangColor(repo.language)};"></span>${repo.language}</span>` : ''}
          <span>⭐ ${repo.stargazers_count}</span>
          <span>🔀 ${repo.forks_count}</span>
        </div>
      </div>
    `).join('');

    container.innerHTML = cards;
    initSpotlightCards();
  } catch (error) {
    console.error('GitHub pinned error:', error);
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted);"><p>Unable to load repos. <a href="https://github.com/${username}" target="_blank" rel="noopener">View on GitHub →</a></p></div>`;
  }
}

function getLangColor(lang) {
  const colors = { Python: '#3572A5', JavaScript: '#f1e05a', TypeScript: '#2b7489', HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051', Rust: '#dea584', Go: '#00ADD8' };
  return colors[lang] || '#8b949e';
}

// ============================================
// PyPI Top 6
// ============================================
async function fetchPyPITop6() {
  const container = document.getElementById('pypiTop6');
  if (!container) return;

  try {
    const manifestResp = await fetch('/data/pypi.json');
    let packages = [];

    if (manifestResp.ok) {
      const manifest = await manifestResp.json();
      packages = manifest.packages || [];
      packages.sort((a, b) => (b.total_downloads || 0) - (a.total_downloads || 0));
      packages = packages.slice(0, 6);
    }

    if (packages.length === 0) {
      container.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted);">No packages found.</p>';
      return;
    }

    const cards = await Promise.all(packages.map(async (pkg) => {
      const pkgName = typeof pkg === 'string' ? pkg : pkg.name;
      const totalDownloads = typeof pkg === 'object' ? pkg.total_downloads : null;
      return await fetchPackageCard(pkgName, totalDownloads);
    }));

    container.innerHTML = cards.filter(c => c).join('');
    initSpotlightCards();
  } catch (error) {
    console.error('PyPI top 6 error:', error);
    container.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted);">Unable to load packages.</p>';
  }
}

// ============================================
// All Packages Page
// ============================================
async function fetchAllPackages() {
  const container = document.getElementById('packagesAll');
  const totalEl = document.getElementById('packagesTotal');
  const searchInput = document.getElementById('packageSearch');
  const sortSelect = document.getElementById('packageSort');
  if (!container) return;

  try {
    const manifestResp = await fetch('/data/pypi.json');
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

      container.innerHTML = cards.filter(c => c).join('') || '<p style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted);">No packages match your search.</p>';
      initSpotlightCards();
    };

    await render();

    searchInput?.addEventListener('input', render);
    sortSelect?.addEventListener('change', render);

  } catch (error) {
    console.error('All packages error:', error);
    container.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted);">Unable to load packages.</p>';
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
      <div class="card spotlight-card glow-border">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
          <h3 style="font-family:var(--font-mono);font-size:1rem;">
            <a href="https://pypi.org/project/${packageName}/" target="_blank" rel="noopener" style="color:var(--text);">${packageName}</a>
          </h3>
          <span style="font-size:0.7rem;padding:0.2rem 0.6rem;background:var(--bg-hover);border-radius:999px;color:var(--text-muted);font-family:var(--font-mono);">v${info.version}</span>
        </div>
        <p style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:1rem;line-height:1.5;">${info.summary || 'No description available.'}</p>
        ${showDetails ? `<div style="display:flex;gap:1rem;font-size:0.8rem;color:var(--text-muted);margin-bottom:1rem;"><span>🐍 ${info.requires_python || 'Any'}</span></div>` : ''}
        <div style="padding-top:1rem;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;">
          <span style="font-family:var(--font-mono);font-size:1.25rem;font-weight:700;color:var(--accent-light);">${downloads}</span>
          <span style="font-size:0.75rem;color:var(--text-muted);">total downloads</span>
        </div>
      </div>
    `;
  } catch (error) {
    return null;
  }
}

// ============================================
// GitHub Activity
// ============================================
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
          <div class="card spotlight-card flex items-center gap-4" style="padding:1rem 1.5rem;">
            <div style="width:40px;height:40px;border-radius:0.5rem;background:var(--bg-hover);display:flex;align-items:center;justify-content:center;font-size:1.25rem;flex-shrink:0;">${icons[event.type] || '⚡'}</div>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:500;margin-bottom:0.25rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${labels[event.type] || 'Activity in'} <a href="https://github.com/${event.repo.name}" target="_blank" rel="noopener" style="color:var(--text);">${repoName}</a></div>
              ${desc ? `<div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:0.25rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${desc}</div>` : ''}
              <div style="font-size:0.8rem;color:var(--text-muted);">${timeAgo}</div>
            </div>
          </div>
        `;
      }).join('');

    container.innerHTML = activityHTML || '<p style="text-align:center;padding:2rem;color:var(--text-muted);">No recent public activity.</p>';
    initSpotlightCards();
  } catch (error) {
    container.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-muted);"><p>Unable to load activity. <a href="https://github.com/${username}" target="_blank" rel="noopener">View on GitHub →</a></p></div>`;
  }
}

// ============================================
// Utilities
// ============================================
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
