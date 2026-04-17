/* Living Word Studio — Preach Mode */

let _sections    = [];
let _current     = 0;
let _timerSec    = 0;
let _timerInterval = null;
let _timerRunning  = false;
let _fontSize    = 1.0;

async function init_preach_mode() {
  const lessons = await LWSApp.getLessons();
  if (!lessons) return;

  const id     = LWSUtils.lsGet('currentLessonId', 'l001');
  const lesson = lessons.find(l => l.id === id) || lessons[0];

  buildSections(lesson);
  renderSection(_current);
  renderProgress();
  initControls(lesson);
  initKeyboard();

  /* Keep screen awake concept via requestWakeLock */
  tryWakeLock();
}

function buildSections(lesson) {
  _sections = [];

  /* Title slide */
  _sections.push({
    type:       'title',
    sectionLabel: 'Opening',
    title:      lesson.title,
    subtitle:   lesson.subtitle,
    scripture:  null,
    point:      null,
    notes:      null,
  });

  /* Core Scripture */
  if (lesson.coreScripture) {
    _sections.push({
      type:        'scripture',
      sectionLabel:'Core Scripture',
      title:       lesson.coreScripture,
      scripture:   lesson.coreScripture,
      point:       null,
      notes:       null,
    });
  }

  /* Burden */
  if (lesson.burden) {
    _sections.push({
      type:        'burden',
      sectionLabel:'Main Burden',
      title:       'The Burden',
      scripture:   null,
      point:       lesson.burden,
      notes:       null,
    });
  }

  /* Lesson Sections */
  (lesson.sections || []).forEach((sec, i) => {
    _sections.push({
      type:        'section',
      sectionLabel:`Section ${i + 1}`,
      title:       sec.title,
      scripture:   sec.scripture || null,
      point:       sec.content   || null,
      notes:       sec.application || null,
    });
  });

  /* Default sections if none */
  if (!lesson.sections || !lesson.sections.length) {
    _sections.push(
      { type:'section', sectionLabel:'Point 1', title:'The Temple Principle', scripture:'1 Corinthians 6:19', point:'Your body houses the Holy Spirit. You are not the owner — you are the steward. Stewardship begins with maintenance.', notes:'What are you allowing to enter the temple?' },
      { type:'section', sectionLabel:'Point 2', title:'Diagnosing the Inner Man', scripture:'Proverbs 4:23', point:'Four diagnostics: prayer life, Word intake, worship posture, and generosity. These reveal the actual state of your spirit.', notes:'Run the checklist. Calibration, not condemnation.' },
      { type:'section', sectionLabel:'Point 3', title:'The Discipline of Renewal', scripture:'Romans 12:1–2', point:'Renewal is not automatic. It requires intentional, scheduled spiritual practice.', notes:'Design your week with spiritual disciplines built in.' }
    );
  }

  /* Closing */
  _sections.push({
    type:        'closing',
    sectionLabel:'Closing',
    title:       'Closing Charge',
    scripture:   null,
    point:       lesson.closingCharge || 'Go and live the Word.',
    notes:       null,
  });
}

function renderSection(idx) {
  const sec     = _sections[idx];
  if (!sec) return;
  const content = LWSUtils.qs('#preach-content');
  if (!content) return;

  let html = `<div class="preach-section-label">${sec.sectionLabel}</div>`;

  if (sec.type === 'title') {
    html += `
      <div class="preach-title">${sec.title}</div>
      ${sec.subtitle ? `<div style="font-size:22px;color:var(--text-secondary);margin-top:-16px;margin-bottom:32px;font-family:var(--font-serif);font-style:italic;">${sec.subtitle}</div>` : ''}`;
  } else {
    html += `<div class="preach-title">${sec.title}</div>`;
  }

  if (sec.scripture) {
    html += `<blockquote class="preach-scripture">${sec.scripture}</blockquote>`;
  }

  if (sec.point) {
    html += `<div class="preach-point">${sec.point}</div>`;
  }

  if (sec.notes) {
    html += `<div class="preach-notes">${sec.notes}</div>`;
  }

  content.innerHTML = html;
  content.style.opacity = '0';
  content.style.transform = 'translateY(12px)';
  content.style.transition = 'opacity 300ms ease, transform 300ms ease';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      content.style.opacity  = '1';
      content.style.transform= 'translateY(0)';
    });
  });

  /* Update section counter */
  const counterEl = LWSUtils.qs('#section-counter');
  if (counterEl) counterEl.textContent = `${idx + 1} / ${_sections.length}`;
}

function renderProgress() {
  const bar = LWSUtils.qs('#preach-progress-bar');
  if (bar) bar.style.width = `${((_current + 1) / _sections.length) * 100}%`;

  /* Update nav dots */
  const dotContainer = LWSUtils.qs('#preach-dots');
  if (dotContainer) {
    dotContainer.innerHTML = _sections.map((_, i) =>
      `<div class="preach-nav-dot${i === _current ? ' active' : ''}" onclick="goToSection(${i})"></div>`
    ).join('');
  }
}

function nextSection() {
  if (_current < _sections.length - 1) {
    _current++;
    renderSection(_current);
    renderProgress();
  }
}

function prevSection() {
  if (_current > 0) {
    _current--;
    renderSection(_current);
    renderProgress();
  }
}

function goToSection(idx) {
  _current = idx;
  renderSection(_current);
  renderProgress();
}

/* ── Timer ── */
function toggleTimer() {
  _timerRunning = !_timerRunning;
  const btn = document.getElementById('timer-btn');
  const timerEl = LWSUtils.qs('#preach-timer');
  if (btn) btn.textContent = _timerRunning ? 'Pause' : 'Start';
  if (timerEl) timerEl.classList.toggle('running', _timerRunning);

  if (_timerRunning) {
    _timerInterval = setInterval(() => {
      _timerSec++;
      updateTimerDisplay();
    }, 1000);
  } else {
    clearInterval(_timerInterval);
  }
}

function resetTimer() {
  clearInterval(_timerInterval);
  _timerRunning = false;
  _timerSec = 0;
  updateTimerDisplay();
  const btn = document.getElementById('timer-btn');
  const timerEl = LWSUtils.qs('#preach-timer');
  if (btn) btn.textContent = 'Start';
  if (timerEl) timerEl.classList.remove('running');
}

function updateTimerDisplay() {
  const el = LWSUtils.qs('#preach-timer');
  if (!el) return;
  const m = Math.floor(_timerSec / 60).toString().padStart(2, '0');
  const s = (_timerSec % 60).toString().padStart(2, '0');
  el.textContent = `${m}:${s}`;
}

/* ── Font Size ── */
function increaseFontSize() {
  _fontSize = Math.min(_fontSize + 0.15, 1.8);
  applyFontSize();
}

function decreaseFontSize() {
  _fontSize = Math.max(_fontSize - 0.15, 0.6);
  applyFontSize();
}

function applyFontSize() {
  const content = LWSUtils.qs('#preach-content');
  if (content) content.style.fontSize = `${_fontSize}em`;
}

/* ── Controls ── */
function initControls(lesson) {
  const nextBtn     = document.getElementById('preach-next');
  const prevBtn     = document.getElementById('preach-prev');
  const timerBtn    = document.getElementById('timer-btn');
  const timerReset  = document.getElementById('timer-reset');
  const fontUp      = document.getElementById('font-up');
  const fontDown    = document.getElementById('font-down');
  const exitBtn     = document.getElementById('preach-exit');
  const noteToggle  = document.getElementById('notes-toggle');

  if (nextBtn)    nextBtn.addEventListener('click', nextSection);
  if (prevBtn)    prevBtn.addEventListener('click', prevSection);
  if (timerBtn)   timerBtn.addEventListener('click', toggleTimer);
  if (timerReset) timerReset.addEventListener('click', resetTimer);
  if (fontUp)     fontUp.addEventListener('click', increaseFontSize);
  if (fontDown)   fontDown.addEventListener('click', decreaseFontSize);
  if (exitBtn)    exitBtn.addEventListener('click', () => window.location.href = 'lesson-builder.html');

  if (noteToggle) {
    noteToggle.addEventListener('click', () => {
      const notes = LWSUtils.qsa('.preach-notes');
      const show  = noteToggle.dataset.show !== 'false';
      notes.forEach(n => n.style.display = show ? 'none' : '');
      noteToggle.dataset.show = show ? 'false' : 'true';
      noteToggle.textContent  = show ? 'Show Notes' : 'Hide Notes';
    });
  }

  /* Lesson title in header */
  const titleEl = LWSUtils.qs('#preach-lesson-title');
  if (titleEl) titleEl.textContent = lesson.title;
}

/* ── Keyboard Navigation ── */
function initKeyboard() {
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === ' ') nextSection();
    if (e.key === 'ArrowLeft')                   prevSection();
    if (e.key === 'f' || e.key === 'F')          toggleFullscreen();
    if (e.key === 'Escape')                       window.location.href = 'lesson-builder.html';
  });
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.();
  } else {
    document.exitFullscreen?.();
  }
}

/* ── Wake Lock (keeps screen on) ── */
async function tryWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      await navigator.wakeLock.request('screen');
    }
  } catch {}
}

window.init_preach_mode = init_preach_mode;
window.nextSection      = nextSection;
window.prevSection      = prevSection;
window.goToSection      = goToSection;
window.toggleTimer      = toggleTimer;
window.resetTimer       = resetTimer;
window.increaseFontSize = increaseFontSize;
window.decreaseFontSize = decreaseFontSize;
