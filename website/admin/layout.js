/**
 * layout.js — Shared sidebar and topbar for all Hunter Autoworks admin pages.
 * Call initLayout({ title, activePage }) at the bottom of each admin page's <script>.
 *
 * activePage values: 'dashboard' | 'bookings' | 'quotes' | 'clients' |
 *                    'invoices' | 'documents' | 'reports' | 'settings'
 */

(function () {
  'use strict';

  const NAV_LINKS = [
    { id: 'dashboard',  label: '📊 Dashboard',  href: 'index.html' },
    { id: 'bookings',   label: '📅 Bookings',   href: 'bookings.html' },
    { id: 'quotes',     label: '💬 Quotes',      href: 'quotes.html' },
    { id: 'clients',    label: '👥 Clients',     href: 'clients.html' },
    { id: 'invoices',   label: '🧾 Invoices',    href: 'invoices.html' },
    { id: 'documents',  label: '📄 Documents',   href: 'documents.html' },
    { id: 'analytics',  label: '📈 Analytics',   href: 'analytics.html' },
    { id: 'reports',    label: '🗂️ Reports',     href: 'reports.html' },
    { id: 'settings',   label: '⚙️ Settings',    href: 'settings.html' }
  ];

  function buildSidebarHTML(activePage) {
    const links = NAV_LINKS.map(link => {
      const isActive = link.id === activePage ? ' active' : '';
      return `<a href="${link.href}" class="nav-link${isActive}" data-page="${link.id}">${link.label}</a>`;
    }).join('\n');

    // Load business name from settings if available
    const settings = JSON.parse(localStorage.getItem('business_settings') || '{}');
    const bizName = settings.name || 'Hunter Auto';

    return `
      <aside class="sidebar" id="adminSidebar" role="navigation" aria-label="Main navigation">
        <div class="sidebar-brand">
          <img src="../images/logo.jpg" alt="Hunter Autoworks logo" width="36" height="36"
               onerror="this.style.display='none'" />
          <div class="sidebar-brand-text">
            <span class="sidebar-brand-name">${escapeHtml(bizName)}</span>
            <span class="sidebar-brand-sub">Admin Panel</span>
          </div>
        </div>
        <nav class="sidebar-nav" aria-label="Admin navigation">
          ${links}
        </nav>
        <div class="sidebar-footer">v2.0 · Hunter Autoworks</div>
      </aside>
    `;
  }

  function buildTopbarHTML(title) {
    return `
      <header class="topbar" role="banner">
        <div class="topbar-left">
          <button class="hamburger" id="sidebarToggle" aria-label="Toggle navigation menu" aria-expanded="false" aria-controls="adminSidebar">
            ☰
          </button>
          <h1 class="topbar-title">${escapeHtml(title)}</h1>
        </div>
        <div class="topbar-right">
          <span class="topbar-user" id="topbarUsername"></span>
          <button class="compact-btn compact-btn-outline topbar-logout" id="topbarLogout">
            Logout
          </button>
        </div>
      </header>
    `;
  }

  function buildOverlayHTML() {
    return `<div class="sidebar-overlay" id="sidebarOverlay" aria-hidden="true"></div>`;
  }

  function wireHamburger() {
    const toggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('adminSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!toggle || !sidebar) return;

    function openSidebar() {
      sidebar.classList.add('active');
      if (overlay) overlay.classList.add('active');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
      sidebar.classList.remove('active');
      if (overlay) overlay.classList.remove('active');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      sidebar.classList.contains('active') ? closeSidebar() : openSidebar();
    });

    if (overlay) {
      overlay.addEventListener('click', closeSidebar);
    }

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sidebar.classList.contains('active')) closeSidebar();
    });

    // Close on resize to desktop
    window.addEventListener('resize', function () {
      if (window.innerWidth > 1024 && sidebar.classList.contains('active')) {
        closeSidebar();
      }
    });

    // Close when a nav link is clicked on mobile
    sidebar.querySelectorAll('.nav-link').forEach(function (link) {
      link.addEventListener('click', function () {
        if (window.innerWidth <= 1024) closeSidebar();
      });
    });
  }

  function wireLogout() {
    const btn = document.getElementById('topbarLogout');
    if (!btn) return;
    btn.addEventListener('click', function () {
      localStorage.removeItem('admin_jwt');
      window.location.href = 'index.html';
    });
  }

  function loadUsername() {
    const el = document.getElementById('topbarUsername');
    if (!el) return;
    // Try to get username from JWT payload (no extra API call needed)
    const token = localStorage.getItem('admin_jwt');
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      el.textContent = payload.username || '';
    } catch (e) {
      // ignore decode errors
    }
  }

  function checkAuth(isLoginPage) {
    const token = localStorage.getItem('admin_jwt');
    if (!token && !isLoginPage) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  /**
   * Main entry point — call this on every admin page.
   *
   * @param {object} options
   * @param {string} options.title       - Page title shown in topbar
   * @param {string} options.activePage  - Nav link to highlight
   * @param {boolean} [options.isLoginPage=false] - Set true on index.html to skip auth redirect
   */
  window.initLayout = function ({ title = 'Dashboard', activePage = 'dashboard', isLoginPage = false } = {}) {
    // Auth guard
    if (!checkAuth(isLoginPage)) return;

    // Find the app-shell wrapper — inject sidebar and topbar into it
    const shell = document.querySelector('.app-shell');
    if (!shell) {
      console.warn('layout.js: .app-shell element not found on this page.');
      return;
    }

    // Build and prepend sidebar
    const sidebarWrapper = document.createElement('div');
    sidebarWrapper.innerHTML = buildSidebarHTML(activePage);
    shell.insertBefore(sidebarWrapper.firstElementChild, shell.firstChild);

    // Build and prepend topbar inside .main-area
    const mainArea = shell.querySelector('.main-area');
    if (mainArea) {
      const topbarWrapper = document.createElement('div');
      topbarWrapper.innerHTML = buildTopbarHTML(title);
      mainArea.insertBefore(topbarWrapper.firstElementChild, mainArea.firstChild);
    }

    // Inject overlay for mobile
    const overlayWrapper = document.createElement('div');
    overlayWrapper.innerHTML = buildOverlayHTML();
    document.body.appendChild(overlayWrapper.firstElementChild);

    // Wire interactions
    wireHamburger();
    wireLogout();
    loadUsername();
  };

})();
