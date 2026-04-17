/* Living Word Studio — Navigation Component */

const LWSNav = (() => {

  const NAV_ITEMS = [
    {
      id:    'dashboard',
      label: 'Dashboard',
      href:  'dashboard.html',
      icon:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
    },
    {
      id:    'lesson-builder',
      label: 'Write',
      href:  'lesson-builder.html',
      icon:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
      badge: null,
    },
    {
      id:    'calendar',
      label: 'Calendar',
      href:  'calendar.html',
      icon:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    },
    {
      id:    'snippets',
      label: 'Snippets',
      href:  'snippets.html',
      icon:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`,
    },
    {
      id:    'library',
      label: 'Library',
      href:  'library.html',
      icon:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
    },
  ];

  const SECONDARY_ITEMS = [
    {
      id:    'settings',
      label: 'Settings',
      href:  'settings.html',
      icon:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    },
  ];

  /* ── Determine current page ── */
  function activePage() {
    const file = window.location.pathname.split('/').pop().replace('.html', '') || 'dashboard';
    return file || 'dashboard';
  }

  /* ── Brand / Logo HTML ── */
  function renderBrand() {
    return `
      <div class="sidebar-brand">
        <div class="sidebar-logo">
          <img src="assets/images/logo.svg" alt="LWS" width="32" height="32">
        </div>
        <div class="sidebar-wordmark">
          <span class="lws-name">Living Word Studio</span>
          <span class="lws-tagline">Write. Study. Preach.</span>
        </div>
        <button class="sidebar-toggle" id="sidebar-toggle" aria-label="Toggle sidebar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      </div>`;
  }

  /* ── Nav Item HTML ── */
  function renderNavItem(item, active) {
    const isActive = item.id === active;
    return `
      <a href="${item.href}" class="nav-item${isActive ? ' active' : ''}" data-page="${item.id}">
        <span class="nav-icon">${item.icon}</span>
        <span class="nav-label">${item.label}</span>
        ${item.badge ? `<span class="nav-badge">${item.badge}</span>` : ''}
      </a>`;
  }

  /* ── Sidebar HTML ── */
  function renderSidebar() {
    const active = activePage();
    return `
      ${renderBrand()}
      <nav class="sidebar-nav">
        <div class="sidebar-nav-section">
          <div class="sidebar-nav-label">Main</div>
          ${NAV_ITEMS.map(i => renderNavItem(i, active)).join('')}
        </div>
        <div class="sidebar-nav-section">
          <div class="sidebar-nav-label">Account</div>
          ${SECONDARY_ITEMS.map(i => renderNavItem(i, active)).join('')}
        </div>
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-profile">
          <div class="sidebar-avatar" id="sidebar-avatar">MW</div>
          <div class="sidebar-profile-info">
            <div class="sidebar-profile-name" id="sidebar-name">Pastor Marcus Webb</div>
            <div class="sidebar-profile-role">Lead Pastor</div>
          </div>
        </div>
      </div>`;
  }

  /* ── Mobile Nav HTML ── */
  function renderMobileNav() {
    const active = activePage();
    const mobileItems = NAV_ITEMS.slice(0, 5);
    return `
      <div class="mobile-nav-inner">
        ${mobileItems.map(item => `
          <a href="${item.href}" class="mobile-nav-item${item.id === active ? ' active' : ''}">
            ${item.icon}
            <span>${item.label}</span>
          </a>
        `).join('')}
      </div>`;
  }

  /* ── Toggle sidebar collapse ── */
  function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    sidebar.classList.toggle('collapsed');
    LWSUtils.lsSet('sidebarCollapsed', sidebar.classList.contains('collapsed'));
  }

  /* ── Mobile open/close ── */
  function openMobile() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.add('mobile-open');
    if (overlay) overlay.style.opacity = '1', overlay.style.pointerEvents = 'auto';
  }

  function closeMobile() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (overlay) overlay.style.opacity = '', overlay.style.pointerEvents = '';
  }

  /* ── Mobile menu button ── */
  function injectMobileMenuBtn() {
    const header = document.querySelector('.page-header');
    if (!header) return;
    const btn = document.createElement('button');
    btn.className = 'btn btn--ghost btn--icon mobile-menu-btn';
    btn.setAttribute('aria-label', 'Open menu');
    btn.style.display = 'none';
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;
    btn.addEventListener('click', openMobile);
    header.insertBefore(btn, header.firstChild);

    const mq = window.matchMedia('(max-width: 768px)');
    function check(e) { btn.style.display = e.matches ? 'flex' : 'none'; }
    mq.addEventListener('change', check);
    check(mq);
  }

  /* ── Load profile data ── */
  async function loadProfile() {
    try {
      const settings = await LWSApp.getSettings();
      if (!settings) return;
      const nameEl = document.getElementById('sidebar-name');
      const avatarEl = document.getElementById('sidebar-avatar');
      if (nameEl)   nameEl.textContent  = settings.profile.name;
      if (avatarEl) avatarEl.textContent = LWSUtils.initials(settings.profile.name);
    } catch {}
  }

  /* ── Init ── */
  async function init() {
    const sidebarEl = document.getElementById('sidebar');
    const mobileNavEl = document.getElementById('mobile-nav');

    if (sidebarEl) {
      sidebarEl.innerHTML = renderSidebar();

      /* Restore collapsed state */
      if (LWSUtils.lsGet('sidebarCollapsed', false)) {
        sidebarEl.classList.add('collapsed');
      }

      /* Sidebar toggle button */
      const toggleBtn = document.getElementById('sidebar-toggle');
      if (toggleBtn) toggleBtn.addEventListener('click', toggleSidebar);
    }

    if (mobileNavEl) {
      mobileNavEl.innerHTML = renderMobileNav();
    }

    injectMobileMenuBtn();
    loadProfile();
  }

  return { init, toggleSidebar, openMobile, closeMobile, activePage };
})();
