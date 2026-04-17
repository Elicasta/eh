/* Living Word Studio — Snippets / Idea Bank Page */

let _allSnippets = [];
let _activeType  = 'all';
let _activeSeries= 'all';
let _searchQuery = '';

async function init_snippets() {
  _allSnippets = await LWSApp.getSnippets() || [];
  renderSnippets();
  initFilters();
  initSearch();
  initNewSnippet();

  LWSUtils.staggerFadeIn(LWSUtils.qsa('.snippet-card'), 60);
}

function renderSnippets() {
  const grid = document.getElementById('snippets-grid');
  if (!grid) return;

  const filtered = filterSnippets();

  if (!filtered.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="24" height="24">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
        </div>
        <div class="empty-title">No snippets found</div>
        <div class="empty-desc">Try adjusting your filters or capture a new thought.</div>
        <button class="btn btn--primary" onclick="openNewSnippet()">+ New Snippet</button>
      </div>`;
    return;
  }

  grid.innerHTML = filtered.map(sn => renderSnippetCard(sn)).join('');
  LWSUtils.staggerFadeIn(LWSUtils.qsa('.snippet-card'), 50);
}

function renderSnippetCard(sn) {
  const typeLabels = {
    thought: 'Thought', scripture: 'Scripture', illustration: 'Illustration',
    'title-idea': 'Title Idea', link: 'Link', quote: 'Quote', question: 'Question',
  };

  const savedIcon = sn.saved
    ? `<svg viewBox="0 0 24 24" fill="var(--accent-orange)" stroke="var(--accent-orange)" stroke-width="1.5" width="14" height="14"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;

  return `
    <div class="snippet-card animate-fade-in" data-id="${sn.id}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
        <div class="snippet-type">
          ${LWSUtils.snippetTypeIcon(sn.type)}
          ${typeLabels[sn.type] || sn.type}
        </div>
        <button class="btn btn--ghost btn--icon-sm" onclick="toggleSave('${sn.id}')" title="Save snippet">
          ${savedIcon}
        </button>
      </div>
      <div class="card-title" style="font-size:14px;font-weight:600;">${sn.title}</div>
      ${sn.reference ? `<div style="font-family:var(--font-serif);font-size:13px;color:var(--accent-gold);font-style:italic;">${sn.reference}</div>` : ''}
      <div class="card-subtitle line-clamp-3" style="font-size:13px;">${LWSUtils.truncate(sn.content, 120)}</div>
      <div class="tags-row">
        ${sn.tags.slice(0, 3).map(t => `<span class="tag">${t}</span>`).join('')}
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
        <span style="font-size:11px;color:var(--text-muted);">${LWSUtils.formatRelative(sn.timestamp)}</span>
        <button class="btn btn--secondary btn--sm" onclick="insertSnippet('${sn.id}')">
          Insert into Lesson
        </button>
      </div>
    </div>`;
}

function filterSnippets() {
  return _allSnippets.filter(sn => {
    const matchType   = _activeType   === 'all' || sn.type === _activeType;
    const matchSeries = _activeSeries === 'all' || sn.series === _activeSeries;
    const matchSearch = !_searchQuery ||
      sn.title.toLowerCase().includes(_searchQuery) ||
      sn.content.toLowerCase().includes(_searchQuery) ||
      sn.tags.some(t => t.toLowerCase().includes(_searchQuery));
    return matchType && matchSeries && matchSearch;
  });
}

function initFilters() {
  /* Type filter buttons */
  LWSUtils.qsa('[data-type-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      LWSUtils.qsa('[data-type-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _activeType = btn.dataset.typeFilter;
      renderSnippets();
    });
  });

  /* Series select */
  const seriesSelect = document.getElementById('series-filter');
  if (seriesSelect) {
    /* Populate options */
    LWSApp.getSeries().then(series => {
      if (!series) return;
      series.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.title;
        seriesSelect.appendChild(opt);
      });
    });

    seriesSelect.addEventListener('change', () => {
      _activeSeries = seriesSelect.value || 'all';
      renderSnippets();
    });
  }

  /* Saved filter */
  const savedBtn = document.getElementById('saved-filter');
  if (savedBtn) {
    savedBtn.addEventListener('click', () => {
      savedBtn.classList.toggle('active');
      if (savedBtn.classList.contains('active')) {
        _allSnippets = _allSnippets.filter(s => s.saved);
      } else {
        LWSApp.getSnippets().then(s => { _allSnippets = s || []; renderSnippets(); });
        return;
      }
      renderSnippets();
    });
  }
}

function initSearch() {
  const input = LWSUtils.qs('#snippets-search');
  if (!input) return;
  input.addEventListener('input', LWSUtils.debounce ? LWSUtils.debounce(() => {
    _searchQuery = input.value.toLowerCase().trim();
    renderSnippets();
  }, 250) : () => {
    _searchQuery = input.value.toLowerCase().trim();
    renderSnippets();
  });
}

function initNewSnippet() {
  const btn = document.getElementById('new-snippet-btn');
  if (btn) btn.addEventListener('click', openNewSnippet);
}

function openNewSnippet() {
  const modal   = document.getElementById('new-snippet-modal');
  const overlay = document.getElementById('modal-overlay');
  if (modal)   modal.style.display = '';
  if (overlay) {
    overlay.style.display = '';
    overlay.addEventListener('click', closeNewSnippet);
  }
}

function closeNewSnippet() {
  const modal   = document.getElementById('new-snippet-modal');
  const overlay = document.getElementById('modal-overlay');
  if (modal)   modal.style.display = 'none';
  if (overlay) overlay.style.display = 'none';
}

function saveNewSnippet() {
  const title   = LWSUtils.qs('#new-snippet-title')?.value?.trim();
  const content = LWSUtils.qs('#new-snippet-content')?.value?.trim();
  const type    = LWSUtils.qs('#new-snippet-type')?.value || 'thought';

  if (!title || !content) {
    LWSUtils.toast('Please fill in title and content', 'error');
    return;
  }

  const newSnippet = {
    id:        `sn${Date.now()}`,
    type,
    title,
    content,
    tags:      [],
    series:    null,
    saved:     false,
    timestamp: new Date().toISOString(),
  };

  _allSnippets.unshift(newSnippet);
  renderSnippets();
  closeNewSnippet();
  LWSUtils.toast('Snippet saved', 'success');
}

function toggleSave(id) {
  const sn = _allSnippets.find(s => s.id === id);
  if (sn) {
    sn.saved = !sn.saved;
    renderSnippets();
    LWSUtils.toast(sn.saved ? 'Snippet saved' : 'Removed from saved', 'default');
  }
}

function insertSnippet(id) {
  LWSUtils.lsSet('insertSnippetId', id);
  LWSUtils.toast('Snippet ready — open lesson builder to insert', 'success');
}

window.init_snippets     = init_snippets;
window.openNewSnippet    = openNewSnippet;
window.closeNewSnippet   = closeNewSnippet;
window.saveNewSnippet    = saveNewSnippet;
window.toggleSave        = toggleSave;
window.insertSnippet     = insertSnippet;
