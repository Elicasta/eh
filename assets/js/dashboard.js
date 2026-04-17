/* Living Word Studio — Dashboard Page */

async function init_dashboard() {
  const { el, qs, qsa, formatDate, formatRelative, greeting,
          staggerFadeIn, statusBadgeClass, statusLabel, truncate,
          todayStr, toast } = LWSUtils;

  /* ── Greeting ── */
  const greetingEl = qs('#greeting-text');
  if (greetingEl) greetingEl.textContent = greeting() + ', Pastor.';

  const dateEl = qs('#greeting-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
  }

  /* ── Load data in parallel ── */
  const [verses, lessons, snippets, calendar, series, videos] = await Promise.all([
    LWSApp.getVerses(),
    LWSApp.getLessons(),
    LWSApp.getSnippets(),
    LWSApp.getCalendar(),
    LWSApp.getSeries(),
    LWSApp.getVideos(),
  ]);

  /* ── Daily Verse ── */
  renderDailyVerse(verses);

  /* ── Continue Writing ── */
  renderContinueCard(lessons);

  /* ── Current Series ── */
  renderSeries(series);

  /* ── Calendar Preview ── */
  renderCalendarPreview(calendar);

  /* ── Latest Message ── */
  renderLatestMessage(lessons);

  /* ── Recent Snippets ── */
  renderRecentSnippets(snippets);

  /* ── Video Bank ── */
  renderVideoBank(videos);

  /* ── Stagger fade-in ── */
  staggerFadeIn(qsa('.animate-fade-in'), 80);

  /* ── Quick Capture Buttons ── */
  qsa('.qa-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      toast(`${btn.dataset.type || 'Capture'} — coming soon in full build`, 'default');
    });
  });
}

function renderDailyVerse(verses) {
  if (!verses || !verses.length) return;
  const today  = new Date();
  const idx    = today.getDate() % verses.length;
  const verse  = verses[idx];
  const card   = LWSUtils.qs('#daily-verse-card');
  if (!card) return;

  card.innerHTML = `
    <div class="verse-theme">${verse.theme}</div>
    <blockquote class="verse-text">${verse.text}</blockquote>
    <div class="verse-ref">${verse.reference} &nbsp;·&nbsp; ${verse.translation}</div>
    <div class="verse-actions" style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap;">
      <button class="btn btn--gold btn--sm" onclick="LWSUtils.toast('Verse added to study notes','success')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Add to Lesson
      </button>
      <button class="btn btn--secondary btn--sm" onclick="LWSUtils.toast('Verse saved','success')">Save</button>
      <button class="btn btn--ghost btn--sm" onclick="window.location.href='lesson-builder.html'">Study</button>
    </div>
  `;
}

function renderContinueCard(lessons) {
  if (!lessons) return;
  const active = lessons.find(l => l.status === 'in_progress') || lessons[0];
  if (!active) return;
  const card = LWSUtils.qs('#continue-card');
  if (!card) return;

  card.innerHTML = `
    <div class="card-eyebrow">Continue Writing</div>
    <div class="lesson-title-display">${active.title}</div>
    <div class="last-edited">Last edited ${LWSUtils.formatRelative(active.lastEdited)} &nbsp;·&nbsp; ${active.seriesTitle}</div>
    <div class="progress-label">
      <span>Progress</span>
      <span style="color:var(--text-primary);font-weight:600">${active.progress}%</span>
    </div>
    <div class="progress-bar" style="margin-bottom:20px">
      <div class="progress-bar-fill" style="width:${active.progress}%"></div>
    </div>
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
      <a href="lesson-builder.html" class="btn btn--primary">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        Resume Writing
      </a>
      <span class="badge ${LWSUtils.statusBadgeClass(active.status)}">${LWSUtils.statusLabel(active.status)}</span>
      <span style="font-size:12px;color:var(--text-muted);margin-left:auto">${active.coreScripture}</span>
    </div>
  `;
}

function renderSeries(series) {
  if (!series) return;
  const grid = LWSUtils.qs('#series-grid');
  if (!grid) return;

  const active = series.filter(s => s.status !== 'completed');
  grid.innerHTML = active.map(s => `
    <div class="series-card" style="--series-color:${s.color}" onclick="window.location.href='library.html'">
      <div class="series-count">${s.count} lessons</div>
      <div class="series-name">${s.title}</div>
      <div class="series-desc">${LWSUtils.truncate(s.description, 80)}</div>
      <div style="margin-top:12px;display:flex;flex-wrap:wrap;gap:6px;">
        ${s.tags.slice(0,3).map(t => `<span class="tag">${t}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

function renderCalendarPreview(events) {
  if (!events) return;
  const list = LWSUtils.qs('#calendar-preview');
  if (!list) return;

  const today    = LWSUtils.todayStr();
  const upcoming = events
    .filter(e => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  list.innerHTML = upcoming.map(ev => {
    const d   = new Date(ev.date + 'T00:00:00');
    const day = d.getDate();
    const mon = d.toLocaleDateString('en-US', { month: 'short' });
    const typeClass = {
      study:   'cal-event--study',
      sunday:  'cal-event--sunday',
      youth:   'cal-event--youth',
      podcast: 'cal-event--podcast',
      prep:    'cal-event--prep',
    }[ev.type] || '';

    return `
      <div class="cal-event ${typeClass}">
        <div class="cal-event-time">
          <div class="time-day">${day}</div>
          <div class="time-month">${mon}</div>
        </div>
        <div class="cal-event-info">
          <div class="cal-event-title">${ev.title}</div>
          <div class="cal-event-meta">${LWSUtils.formatTime(ev.time)} &nbsp;·&nbsp; ${ev.prepStatus ? LWSUtils.statusLabel(ev.prepStatus) : 'No status'}</div>
        </div>
        <a href="calendar.html" class="btn btn--ghost btn--sm">View</a>
      </div>`;
  }).join('');
}

function renderLatestMessage(lessons) {
  if (!lessons) return;
  const preached = lessons
    .filter(l => l.status === 'preached' && l.datePreached)
    .sort((a, b) => b.datePreached.localeCompare(a.datePreached))[0];
  if (!preached) return;
  const card = LWSUtils.qs('#latest-message');
  if (!card) return;

  card.innerHTML = `
    <div class="card-eyebrow">Latest Message</div>
    <div class="card-title" style="margin-top:8px;font-size:18px;">${preached.title}</div>
    <div style="color:var(--text-muted);font-size:13px;margin-top:4px;">
      Preached ${LWSUtils.formatDate(preached.datePreached)} &nbsp;·&nbsp; ${preached.coreScripture}
    </div>
    ${preached.burden ? `<div style="color:var(--text-secondary);font-size:13px;margin-top:12px;line-height:1.6;">${LWSUtils.truncate(preached.burden, 120)}</div>` : ''}
    <div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap;">
      <a href="library.html" class="btn btn--secondary btn--sm">View</a>
      <button class="btn btn--secondary btn--sm" onclick="LWSUtils.toast('PDF export coming soon','default')">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        Export PDF
      </button>
      <a href="preach-mode.html" class="btn btn--ghost btn--sm">Preach Mode</a>
    </div>
  `;
}

function renderRecentSnippets(snippets) {
  if (!snippets) return;
  const grid = LWSUtils.qs('#snippets-preview');
  if (!grid) return;

  const recent = snippets.slice(0, 3);
  grid.innerHTML = recent.map(sn => `
    <div class="snippet-card animate-fade-in" onclick="window.location.href='snippets.html'">
      <div class="snippet-type">
        ${LWSUtils.snippetTypeIcon(sn.type)}
        ${sn.type}
      </div>
      <div class="card-title" style="font-size:14px;">${sn.title}</div>
      <div class="card-subtitle" style="font-size:12px;">${LWSUtils.truncate(sn.content, 80)}</div>
      <div class="tags-row" style="margin-top:8px;">
        ${sn.tags.slice(0,2).map(t => `<span class="tag">${t}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

function renderVideoBank(videos) {
  if (!videos) return;
  const grid = LWSUtils.qs('#video-grid');
  if (!grid) return;

  grid.innerHTML = videos.slice(0, 6).map(v => `
    <div class="video-thumb" onclick="LWSUtils.toast('Video player coming soon','default')">
      <div class="video-thumb-img">
        <div class="play-icon">
          <svg viewBox="0 0 24 24" fill="white" width="16" height="16"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </div>
      </div>
      <div class="video-thumb-meta">
        <div class="video-thumb-title">${v.title}</div>
        <div class="video-thumb-date">${LWSUtils.formatDate(v.date)} &nbsp;·&nbsp; ${v.duration}</div>
      </div>
    </div>
  `).join('');
}

window.init_dashboard = init_dashboard;
