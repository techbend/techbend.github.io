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

  try {
    const response = await fetch('/data/manifest.json');
    if (!response.ok) throw new Error('Failed to load manifest.json');
    const data = await response.json();

    const publicRepos = data.public_repos || '—';
    const packageCount = (data.packages || []).length;
    const contributions = data.contributions_last_year || '—';

    container.innerHTML = `
      <div class="card card-glass" style="text-align:center;">
        <div style="font-size:2rem;font-weight:700;font-family:var(--font-mono);color:var(--accent-light);margin-bottom:0.25rem;">${publicRepos}</div>
        <div style="font-size:0.875rem;color:var(--text-muted);">GitHub Repos</div>
      </div>
      <div class="card card-glass" style="text-align:center;">
        <div style="font-size:2rem;font-weight:700;font-family:var(--font-mono);color:var(--accent-light);margin-bottom:0.25rem;">${packageCount || '—'}</div>
        <div style="font-size:0.875rem;color:var(--text-muted);">PyPI Packages</div>
      </div>
      <div class="card card-glass" style="text-align:center;">
        <div style="font-size:2rem;font-weight:700;font-family:var(--font-mono);color:var(--accent-cyan);margin-bottom:0.25rem;">${contributions}</div>
        <div style="font-size:0.875rem;color:var(--text-muted);">Contributions (last year)</div>
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
    const response = await fetch('/data/manifest.json');
    if (!response.ok) throw new Error('Failed to load manifest.json');

    const data = await response.json();
    const repos = data.pinned_projects || [];

    if (repos.length === 0) {
      container.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted);">No repositories found.</p>';
      return;
    }

    const cards = repos.map(repo => `
      <div class="card spotlight-card glow-border" style="display:flex;flex-direction:column;height:100%;">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.75rem;">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="color:var(--text-muted);flex-shrink:0;"><path fill-rule="evenodd" d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/></svg>
          <h3 style="font-family:var(--font-mono);font-size:0.95rem;">
            <a href="${repo.html_url}" target="_blank" rel="noopener" style="color:var(--text);">${repo.name}</a>
          </h3>
        </div>
        <p style="flex:1;font-size:0.875rem;color:var(--text-secondary);margin-bottom:1rem;line-height:1.5;">${repo.description || 'No description available.'}</p>
        <div style="display:flex;gap:1rem;font-size:0.8rem;color:var(--text-muted);margin-top:auto;">
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
    const manifestResp = await fetch('/data/manifest.json');
    let packages = [];

    if (manifestResp.ok) {
      const manifest = await manifestResp.json();
      packages = manifest.top_packages || [];
    }

    if (packages.length === 0) {
      container.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted);">No packages found.</p>';
      return;
    }

    const cards = packages.map((pkg) => {
      const pkgName = typeof pkg === 'string' ? pkg : pkg.name;
      const totalDownloads = typeof pkg === 'object' ? pkg.total_downloads : null;
      const version = typeof pkg === 'object' ? pkg.version : null;
      const summary = typeof pkg === 'object' ? pkg.summary : null;
      const requiresPython = typeof pkg === 'object' ? pkg.requires_python : null;
      return renderPackageCard(pkgName, totalDownloads, version, summary, requiresPython);
    });

    container.innerHTML = cards.join('');
    initSpotlightCards();
  } catch (error) {
    console.error('PyPI top 6 error:', error);
    container.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted);">Unable to load packages.</p>';
  }
}

// ============================================
// Package Card Renderer
// ============================================
function renderPackageCard(packageName, knownDownloads = null, version = null, summary = null, requiresPython = null) {
  const downloads = knownDownloads !== null ? formatNumber(knownDownloads) : '—';
  const displayVersion = version || '—';
  const displaySummary = summary || 'No description available.';

  return `
    <div class="card spotlight-card glow-border" style="display:flex;flex-direction:column;height:100%;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
        <h3 style="font-family:var(--font-mono);font-size:1rem;">
          <a href="https://pypi.org/project/${packageName}/" target="_blank" rel="noopener" style="color:var(--text);">${packageName}</a>
        </h3>
        <span style="font-size:0.7rem;padding:0.2rem 0.6rem;background:var(--bg-hover);border-radius:999px;color:var(--text-muted);font-family:var(--font-mono);">v${displayVersion}</span>
      </div>
      <p style="flex:1;font-size:0.875rem;color:var(--text-secondary);margin-bottom:1rem;line-height:1.5;">${displaySummary}</p>
      <div style="padding-top:1rem;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;margin-top:auto;">
        <span style="font-family:var(--font-mono);font-size:1.25rem;font-weight:700;color:var(--accent-light);">${downloads}</span>
        <span style="font-size:0.75rem;color:var(--text-muted);">total downloads</span>
      </div>
    </div>
  `;
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
