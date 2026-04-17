/* Living Word Studio — App Core */

const LWSApp = (() => {
  const BASE = (() => {
    const parts = window.location.pathname.split('/');
    const isFile = parts[parts.length - 1].includes('.');
    if (isFile) parts.pop();
    return parts.join('/').replace(/\/$/, '');
  })();

  const DATA_PATH = `${BASE}/assets/data`;

  const state = {
    currentLesson: null,
    autosaveTimer: null,
    preachSection: 0,
    preachTimer:   0,
    preachRunning: false,
    sidebarOpen:   !LWSUtils.lsGet('sidebarCollapsed', false),
  };

  /* ── Data getters — backed by LWSStorage ── */
  const getLessons  = () => Promise.resolve(LWSStorage.getLessons());
  const getSnippets = () => Promise.resolve(LWSStorage.getSnippets());
  const getCalendar = () => Promise.resolve(LWSStorage.getEvents());
  const getSeries   = () => Promise.resolve(LWSStorage.getSeries());
  const getSettings = () => Promise.resolve(LWSStorage.getSettings());

  async function _fetchJSON(name) {
    try {
      const r = await fetch(`${DATA_PATH}/${name}.json`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      console.error(`LWSApp: failed to load ${name}`, e);
      return null;
    }
  }

  const getVerses = () => _fetchJSON('verses');
  const getVideos = () => _fetchJSON('videos');

  /* ── Autosave indicator ── */
  function triggerAutosave(indicator) {
    clearTimeout(state.autosaveTimer);
    if (indicator) {
      indicator.classList.add('saving');
      const textEl = indicator.querySelector('.as-text');
      if (textEl) textEl.textContent = 'Saving\u2026';
    }
    state.autosaveTimer = setTimeout(() => {
      if (indicator) {
        indicator.classList.remove('saving');
        const textEl = indicator.querySelector('.as-text');
        if (textEl) {
          textEl.textContent = 'Saved';
          setTimeout(() => { if (textEl) textEl.textContent = 'All changes saved'; }, 2000);
        }
      }
    }, 1200);
  }

  function currentPage() {
    const path = window.location.pathname;
    const file = path.split('/').pop().replace('.html', '') || 'dashboard';
    return file === '' ? 'dashboard' : file;
  }

  function navigateTo(page, params = {}) {
    const qs = Object.keys(params).length
      ? '?' + new URLSearchParams(params).toString()
      : '';
    window.location.href = `${BASE}/${page}.html${qs}`;
  }

  async function init() {
    /* Seed localStorage from JSON files on first run */
    await LWSStorage.seed();

    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebar-overlay';
    overlay.addEventListener('click', () => LWSNav.closeMobile());
    document.body.appendChild(overlay);

    await LWSNav.init();

    const page   = currentPage();
    const fnName = `init_${page.replace(/-/g, '_')}`;
    if (typeof window[fnName] === 'function') {
      window[fnName]();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    getVerses, getLessons, getSnippets, getCalendar,
    getSeries, getVideos, getSettings,
    state, triggerAutosave, currentPage, navigateTo,
    BASE, DATA_PATH,
  };
})();
