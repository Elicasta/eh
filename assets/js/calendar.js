/* Living Word Studio — Calendar Page */

async function init_calendar() {
  const [events, lessons] = await Promise.all([
    LWSApp.getCalendar(),
    LWSApp.getLessons(),
  ]);

  renderMonthGrid(events);
  renderAgenda(events, lessons);
  initViewTabs();
  initMonthNav(events);
}

let _currentYear  = new Date().getFullYear();
let _currentMonth = new Date().getMonth();
let _calEvents    = [];

async function initMonthNav(events) {
  _calEvents = events || [];
  const prevBtn = document.getElementById('cal-prev');
  const nextBtn = document.getElementById('cal-next');

  if (prevBtn) prevBtn.addEventListener('click', () => {
    _currentMonth--;
    if (_currentMonth < 0) { _currentMonth = 11; _currentYear--; }
    updateMonthGrid();
  });

  if (nextBtn) nextBtn.addEventListener('click', () => {
    _currentMonth++;
    if (_currentMonth > 11) { _currentMonth = 0; _currentYear++; }
    updateMonthGrid();
  });
}

function updateMonthGrid() {
  const label = document.getElementById('cal-month-label');
  if (label) {
    label.textContent = new Date(_currentYear, _currentMonth, 1)
      .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
  renderMonthGrid(_calEvents);
}

function renderMonthGrid(events) {
  const grid = LWSUtils.qs('#month-grid');
  if (!grid) return;

  const year  = _currentYear;
  const month = _currentMonth;

  /* Update label */
  const label = document.getElementById('cal-month-label');
  if (label) {
    label.textContent = new Date(year, month, 1)
      .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMon = new Date(year, month + 1, 0).getDate();
  const daysInPrev= new Date(year, month, 0).getDate();
  const today     = new Date();
  const todayKey  = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  /* Day header row */
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  let html = days.map(d => `<div class="cal-day-header">${d}</div>`).join('');

  const totalCells = Math.ceil((firstDay + daysInMon) / 7) * 7;

  for (let cell = 0; cell < totalCells; cell++) {
    let dayNum, dateStr, isOther = false;

    if (cell < firstDay) {
      dayNum = daysInPrev - firstDay + cell + 1;
      const m = String(month).padStart(2, '0') || '12';
      const y = month === 0 ? year - 1 : year;
      const mo = month === 0 ? 12 : month;
      dateStr = `${y}-${String(mo).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
      isOther = true;
    } else if (cell >= firstDay + daysInMon) {
      dayNum = cell - firstDay - daysInMon + 1;
      const mo = month === 11 ? 1 : month + 2;
      const y  = month === 11 ? year + 1 : year;
      dateStr = `${y}-${String(mo).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
      isOther = true;
    } else {
      dayNum  = cell - firstDay + 1;
      dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
    }

    const isToday    = dateStr === todayKey;
    const dayEvents  = (events || []).filter(e => e.date === dateStr);
    const hasEvent   = dayEvents.length > 0;

    const eventDots = dayEvents.slice(0, 3).map(ev => {
      const cls = {
        study:   'cal-dot-event--study',
        sunday:  'cal-dot-event--sunday',
        youth:   'cal-dot-event--youth',
        podcast: 'cal-dot-event--podcast',
        prep:    'cal-dot-event--prep',
      }[ev.type] || '';
      return `<div class="cal-dot-event ${cls}">${ev.title}</div>`;
    }).join('');

    html += `
      <div class="cal-day-cell${isToday ? ' today' : ''}${isOther ? ' other-month' : ''}${hasEvent ? ' has-event' : ''}"
           data-date="${dateStr}"
           onclick="selectCalDay('${dateStr}')">
        <div class="cal-day-num">${dayNum}</div>
        <div class="cal-day-events">${eventDots}</div>
      </div>`;
  }

  grid.innerHTML = html;
}

function selectCalDay(dateStr) {
  /* Highlight selected day */
  LWSUtils.qsa('.cal-day-cell').forEach(c => c.classList.remove('selected'));
  const cell = LWSUtils.qs(`[data-date="${dateStr}"]`);
  if (cell) cell.classList.add('selected');

  /* Show events for this day in detail panel */
  const dayEvents = (_calEvents || []).filter(e => e.date === dateStr);
  renderEventDetail(dateStr, dayEvents);
}

function renderEventDetail(dateStr, events) {
  const panel = document.getElementById('event-detail-panel');
  if (!panel) return;

  const d = new Date(dateStr + 'T00:00:00');
  const dateLabel = d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });

  if (!events.length) {
    panel.innerHTML = `
      <div class="section-header">
        <div>
          <div class="section-title">${dateLabel}</div>
          <div style="color:var(--text-muted);font-size:13px;margin-top:4px;">No events scheduled</div>
        </div>
      </div>
      <div class="empty-state" style="padding:32px 0">
        <div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="24" height="24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
        <div class="empty-title">Free day</div>
        <div class="empty-desc">No events here. Use this block for writing or prep.</div>
      </div>
      <button class="btn btn--secondary" style="width:100%;" onclick="LWSUtils.toast('New event UI coming soon','default')">+ Add Event</button>`;
    return;
  }

  panel.innerHTML = `
    <div class="section-header" style="margin-bottom:16px">
      <div>
        <div class="section-title">${dateLabel}</div>
        <div style="color:var(--text-muted);font-size:13px;margin-top:2px;">${events.length} event${events.length > 1 ? 's' : ''}</div>
      </div>
      <button class="btn btn--secondary btn--sm" onclick="LWSUtils.toast('New event UI coming soon','default')">+ Add</button>
    </div>
    ${events.map(ev => renderEventCard(ev)).join('')}`;
}

function renderEventCard(ev) {
  const typeColor = {
    study:'var(--status-progress)', sunday:'var(--accent-orange)',
    youth:'#FF9F0A', podcast:'var(--status-preached)', prep:'var(--accent-gold)'
  }[ev.type] || 'var(--text-muted)';

  const prepBadge = ev.prepStatus
    ? `<span class="badge ${LWSUtils.statusBadgeClass(ev.prepStatus)}">${LWSUtils.statusLabel(ev.prepStatus)}</span>`
    : '';

  return `
    <div class="card" style="margin-bottom:12px;border-left:3px solid ${typeColor}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
        <div>
          <div class="card-title" style="font-size:15px;">${ev.title}</div>
          <div style="color:var(--text-muted);font-size:12px;margin-top:2px;">${LWSUtils.formatTime(ev.time)} &nbsp;·&nbsp; ${ev.duration} min &nbsp;·&nbsp; ${ev.location || ''}</div>
        </div>
        ${prepBadge}
      </div>
      ${ev.notes ? `<div style="color:var(--text-secondary);font-size:13px;margin-top:8px;line-height:1.5;">${ev.notes}</div>` : ''}
      ${ev.linkedLessonId ? `
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-soft);display:flex;gap:8px;">
          <a href="lesson-builder.html" class="btn btn--secondary btn--sm">Open Lesson</a>
          <a href="preach-mode.html" class="btn btn--ghost btn--sm">Preach Mode</a>
        </div>` : ''}
    </div>`;
}

function renderAgenda(events, lessons) {
  const list = document.getElementById('agenda-list');
  if (!list) return;

  const today   = LWSUtils.todayStr();
  const upcoming = (events || [])
    .filter(e => e.date >= today)
    .sort((a,b) => a.date.localeCompare(b.date));

  if (!upcoming.length) {
    list.innerHTML = `<div class="empty-state"><div class="empty-title">No upcoming events</div></div>`;
    return;
  }

  /* Group by date */
  const grouped = {};
  upcoming.forEach(ev => {
    if (!grouped[ev.date]) grouped[ev.date] = [];
    grouped[ev.date].push(ev);
  });

  list.innerHTML = Object.entries(grouped).map(([date, evs]) => {
    const d = new Date(date + 'T00:00:00');
    const label = d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });
    return `
      <div style="margin-bottom:24px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px;">${label}</div>
        ${evs.map(ev => renderEventCard(ev)).join('')}
      </div>`;
  }).join('');
}

function initViewTabs() {
  const tabs  = LWSUtils.qsa('.cal-view-tab');
  const views = { month: '#month-view', agenda: '#agenda-view' };

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.view;
      Object.entries(views).forEach(([key, sel]) => {
        const el = LWSUtils.qs(sel);
        if (el) el.style.display = key === target ? '' : 'none';
      });
    });
  });
}

window.init_calendar  = init_calendar;
window.selectCalDay   = selectCalDay;
