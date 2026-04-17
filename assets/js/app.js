/* Living Word Studio — App Core */

const LWSApp = (() => {
  const BASE = (() => {
    const parts = window.location.pathname.split('/');
    /* detect depth — if we're in a file, strip the filename */
    const isFile = parts[parts.length - 1].includes('.');
    if (isFile) parts.pop();
    return parts.join('/').replace(/\/$/, '');
  })();

  const DATA_PATH = `${BASE}/assets/data`;

  /* ── In-memory cache ── */
  const _cache = {};

  async function fetchData(name) {
    if (_cache[name]) return _cache[name];
    try {
      const res  = await fetch(`${DATA_PATH}/${name}.json`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      _cache[name] = data;
      return data;
    } catch (e) {
      console.error(`LWSApp: failed to load ${name}`, e);
      return null;
    }
  }

  /* ── Public data loaders ── */
  const getVerses   = () => fetchData('verses');
  const getLessons  = () => fetchData('lessons');
  const getSnippets = () => fetchData('snippets');
  const getCalendar = () => fetchData('calendar');
  const getSeries   = () => fetchData('series');
  const getVideos   = () => fetchData('videos');
  const getSettings = () => fetchData('settings');

  /* ── App State (volatile session state) ── */
  const state = {
    currentLesson: LWSUtils.lsGet('currentLessonId', 'l001'),
    autosaveTimer: null,
    preachSection: 0,
    preachTimer:   0,
    preachRunning: false,
    sidebarOpen:   !LWSUtils.lsGet('sidebarCollapsed', false),
  };

  /* ── Autosave ── */
  function triggerAutosave(indicator) {
    clearTimeout(state.autosaveTimer);
    if (indicator) {
      indicator.classList.add('saving');
      indicator.querySelector('.dot') && (indicator.querySelector('.as-text').textContent = 'Saving…');
    }
    state.autosaveTimer = setTimeout(() => {
      if (indicator) {
        indicator.classList.remove('saving');
        const textEl = indicator.querySelector('.as-text');
        if (textEl) textEl.textContent = 'Saved';
        setTimeout(() => { if (textEl) textEl.textContent = 'All changes saved'; }, 2000);
      }
    }, 1200);
  }

  /* ── Page Utilities ── */
  function currentPage() {
    const path = window.location.pathname;
    const file = path.split('/').pop().replace('.html', '') || 'dashboard';
    return file === '' ? 'dashboard' : file;
  }

  function navigateTo(page) {
    window.location.href = `${BASE}/${page}.html`;
  }

  /* ── Init ── */
  async function init() {
    /* Inject sidebar overlay for mobile */
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebar-overlay';
    overlay.addEventListener('click', () => LWSNav.closeMobile());
    document.body.appendChild(overlay);

    /* Initialize navigation */
    await LWSNav.init();

    /* Page-level init */
    const page = currentPage();
    if (typeof window[`init_${page.replace('-', '_')}`] === 'function') {
      window[`init_${page.replace('-', '_')}`]();
    }
  }

  /* Auto-init on DOM ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    getVerses, getLessons, getSnippets, getCalendar,
    getSeries, getVideos, getSettings,
    state, triggerAutosave, currentPage, navigateTo,
    BASE, DATA_PATH
  };
})();
