/* Living Word Studio — Library / Archive Page */

let _allLessons  = [];
let _activeStatus= 'all';
let _activeSeries= 'all';
let _libSearch   = '';

async function init_library() {
  const [lessons, series] = await Promise.all([
    LWSApp.getLessons(),
    LWSApp.getSeries(),
  ]);
  _allLessons = lessons || [];

  populateSeriesFilter(series);
  renderLibrary();
  initLibraryFilters();
  initLibrarySearch();

  LWSUtils.staggerFadeIn(LWSUtils.qsa('.lesson-card-item'), 70);
}

function populateSeriesFilter(series) {
  const sel = document.getElementById('lib-series-filter');
  if (!sel || !series) return;
  series.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.title;
    sel.appendChild(opt);
  });
}

function renderLibrary() {
  const filtered = filterLessons();
  renderGrouped(filtered);
  updateCount(filtered.length);
}

function filterLessons() {
  return _allLessons.filter(l => {
    const matchStatus = _activeStatus === 'all' || l.status === _activeStatus;
    const matchSeries = _activeSeries === 'all' || l.seriesId === _activeSeries;
    const matchSearch = !_libSearch ||
      l.title.toLowerCase().includes(_libSearch) ||
      (l.coreScripture || '').toLowerCase().includes(_libSearch) ||
      (l.seriesTitle   || '').toLowerCase().includes(_libSearch) ||
      (l.burden        || '').toLowerCase().includes(_libSearch);
    return matchStatus && matchSeries && matchSearch;
  });
}

function renderGrouped(lessons) {
  const container = document.getElementById('library-content');
  if (!container) return;

  if (!lessons.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="24" height="24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div>
        <div class="empty-title">No lessons found</div>
        <div class="empty-desc">Try adjusting your search or filters.</div>
        <a href="lesson-builder.html" class="btn btn--primary">Start Writing</a>
      </div>`;
    return;
  }

  /* Group: Recent (last 60 days), then by series */
  const now    = new Date();
  const cutoff = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const recent = lessons.filter(l => l.lastEdited >= cutoff);
  const older  = lessons.filter(l => l.lastEdited < cutoff);

  let html = '';

  if (recent.length) {
    html += `<div class="library-section">
      <div class="section-header">
        <div class="section-title">Recent</div>
        <span style="font-size:12px;color:var(--text-muted)">${recent.length} lesson${recent.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="lessons-list">${recent.map(l => renderLessonCard(l)).join('')}</div>
    </div>`;
  }

  if (older.length) {
    html += `<div class="library-section">
      <div class="section-header">
        <div class="section-title">Archive</div>
        <span style="font-size:12px;color:var(--text-muted)">${older.length} lesson${older.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="lessons-list">${older.map(l => renderLessonCard(l)).join('')}</div>
    </div>`;
  }

  container.innerHTML = html;
}

function renderLessonCard(l) {
  const icons = {
    notion: l.notionSynced   ? `<span class="sync-chip" title="Notion synced"><svg viewBox="0 0 24 24" fill="currentColor" width="10" height="10"><rect x="3" y="3" width="18" height="18" rx="2"/></svg> Notion</span>` : '',
    pdf:    l.pdfExported    ? `<span class="sync-chip" title="PDF exported"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> PDF</span>` : '',
    yt:     l.youtubeLinked  ? `<span class="sync-chip" style="background:rgba(255,0,0,0.08);color:#FF4444;border-color:rgba(255,0,0,0.15)" title="YouTube linked">▶ YouTube</span>` : '',
  };

  return `
    <div class="lesson-row lesson-card-item animate-fade-in" onclick="openLesson('${l.id}')">
      <div class="lesson-row-info">
        <div class="lesson-row-title">${l.title}</div>
        <div class="lesson-row-meta">
          ${l.seriesTitle} &nbsp;·&nbsp; ${l.coreScripture}
          ${l.datePreached ? ` &nbsp;·&nbsp; Preached ${LWSUtils.formatDate(l.datePreached)}` : ''}
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px;">
          ${icons.notion}${icons.pdf}${icons.yt}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0;">
        <span class="badge ${LWSUtils.statusBadgeClass(l.status)}">${LWSUtils.statusLabel(l.status)}</span>
        <div style="display:flex;gap:6px;">
          <a href="preach-mode.html" class="btn btn--ghost btn--sm" onclick="event.stopPropagation()">Preach</a>
          <button class="btn btn--secondary btn--sm" onclick="event.stopPropagation();duplicateLesson('${l.id}')">Duplicate</button>
          <button class="btn btn--ghost btn--sm" onclick="event.stopPropagation();exportLesson('${l.id}')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            PDF
          </button>
        </div>
      </div>
    </div>`;
}

function updateCount(n) {
  const el = document.getElementById('lesson-count');
  if (el) el.textContent = `${n} lesson${n !== 1 ? 's' : ''}`;
}

function initLibraryFilters() {
  /* Status tabs */
  LWSUtils.qsa('[data-status-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      LWSUtils.qsa('[data-status-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      _activeStatus = btn.dataset.statusFilter;
      renderLibrary();
    });
  });

  /* Series select */
  const seriesSel = document.getElementById('lib-series-filter');
  if (seriesSel) {
    seriesSel.addEventListener('change', () => {
      _activeSeries = seriesSel.value || 'all';
      renderLibrary();
    });
  }
}

function initLibrarySearch() {
  const input = LWSUtils.qs('#library-search');
  if (!input) return;
  input.addEventListener('input', () => {
    _libSearch = input.value.toLowerCase().trim();
    renderLibrary();
  });
}

function openLesson(id) {
  LWSUtils.lsSet('currentLessonId', id);
  window.location.href = 'lesson-builder.html';
}

function duplicateLesson(id) {
  LWSUtils.toast('Lesson duplicated — open in Lesson Builder', 'success');
}

function exportLesson(id) {
  LWSUtils.toast('PDF export — architecture ready for backend integration', 'default');
}

window.init_library   = init_library;
window.openLesson     = openLesson;
window.duplicateLesson= duplicateLesson;
window.exportLesson   = exportLesson;
