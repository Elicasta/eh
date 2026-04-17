/* Living Word Studio — Lesson Builder Page */

async function init_lesson_builder() {
  const lesson = await loadCurrentLesson();
  if (!lesson) return;

  renderLessonMeta(lesson);
  renderStructureNav(lesson);
  renderSections(lesson);
  initPanel();
  initAutosave();
  initExportButtons();
}

async function loadCurrentLesson() {
  const lessons = await LWSApp.getLessons();
  if (!lessons) return null;
  const id = LWSUtils.lsGet('currentLessonId', 'l001');
  return lessons.find(l => l.id === id) || lessons[0];
}

function renderLessonMeta(lesson) {
  const titleEl    = LWSUtils.qs('#lesson-title');
  const subtitleEl = LWSUtils.qs('#lesson-subtitle');
  const burdenEl   = LWSUtils.qs('#lesson-burden');
  const scriptEl   = LWSUtils.qs('#core-scripture');
  const badgeEl    = LWSUtils.qs('#lesson-status-badge');
  const calEl      = LWSUtils.qs('#linked-event');
  const seriesEl   = LWSUtils.qs('#lesson-series');

  if (titleEl)    titleEl.value    = lesson.title;
  if (subtitleEl) subtitleEl.value = lesson.subtitle;
  if (burdenEl)   burdenEl.value   = lesson.burden;
  if (scriptEl)   scriptEl.value   = lesson.coreScripture;

  if (badgeEl) {
    badgeEl.className = `badge ${LWSUtils.statusBadgeClass(lesson.status)}`;
    badgeEl.textContent = LWSUtils.statusLabel(lesson.status);
  }

  if (seriesEl && lesson.seriesTitle) {
    seriesEl.textContent = lesson.seriesTitle;
  }

  if (calEl) {
    calEl.textContent = lesson.lastEdited
      ? `Last edited ${LWSUtils.formatRelative(lesson.lastEdited)}`
      : 'Not linked to calendar';
  }

  /* Supporting scriptures */
  const suppEl = LWSUtils.qs('#supporting-scriptures');
  if (suppEl && lesson.supporting) {
    suppEl.value = lesson.supporting.join(', ');
  }
}

function renderStructureNav(lesson) {
  const nav = LWSUtils.qs('#structure-nav');
  if (!nav) return;

  const items = [
    { key: 'burden',   label: 'Main Burden'  },
    { key: 'intro',    label: 'Introduction' },
    ...lesson.sections.filter(s => s.type === 'point').map((s, i) => ({
      key: s.id, label: `Point ${i + 1}: ${s.title}`
    })),
    { key: 'application', label: 'Application'   },
    { key: 'closing',     label: 'Closing Charge' },
    { key: 'notes',       label: 'Notes'          },
  ];

  nav.innerHTML = items.map((item, i) => {
    const sec = lesson.sections.find(s => s.id === item.key || s.type === item.key);
    const done = sec ? sec.complete : false;
    return `
      <div class="structure-nav-item${i === 0 ? ' active' : ''}${done ? ' done' : ''}"
           data-target="${item.key}"
           onclick="scrollToSection('${item.key}', this)">
        <span class="sni-dot"></span>
        <span class="sni-label">${item.label}</span>
        <svg class="sni-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="12" height="12">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      </div>`;
  }).join('');
}

function scrollToSection(key, navItem) {
  /* Update active state */
  LWSUtils.qsa('.structure-nav-item').forEach(el => el.classList.remove('active'));
  if (navItem) navItem.classList.add('active');

  /* Scroll to section */
  const target = document.getElementById(`section-${key}`);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target.classList.add('section-highlight');
    setTimeout(() => target.classList.remove('section-highlight'), 1200);
  }
}

function renderSections(lesson) {
  const container = LWSUtils.qs('#lesson-sections');
  if (!container) return;

  const sections = lesson.sections.length
    ? lesson.sections
    : getDefaultSections();

  container.innerHTML = sections.map((sec, i) => renderSectionModule(sec, i)).join('');

  /* Wire up collapse toggles */
  LWSUtils.qsa('.lesson-section-header').forEach(header => {
    header.addEventListener('click', () => {
      const body = header.nextElementSibling;
      if (body) {
        const isOpen = body.style.display !== 'none';
        body.style.display = isOpen ? 'none' : '';
        const chevron = header.querySelector('.collapse-chevron');
        if (chevron) chevron.style.transform = isOpen ? 'rotate(-90deg)' : '';
      }
    });
  });
}

function renderSectionModule(sec, i) {
  const sectionColors = {
    intro:       'var(--status-progress)',
    point:       'var(--accent-orange)',
    application: 'var(--status-ready)',
    closing:     'var(--accent-gold)',
    notes:       'var(--text-muted)',
  };
  const color = sectionColors[sec.type] || 'var(--accent-orange)';

  return `
    <div class="lesson-section-module animate-fade-in" id="section-${sec.id}">
      <div class="lesson-section-header">
        <svg class="lesson-section-drag" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
          <circle cx="9" cy="5" r="1"/><circle cx="15" cy="5" r="1"/>
          <circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>
          <circle cx="9" cy="19" r="1"/><circle cx="15" cy="19" r="1"/>
        </svg>
        <div class="lesson-section-num" style="background:${color}22;color:${color}">${i + 1}</div>
        <div class="lesson-section-title">${sec.title}</div>
        <span class="badge ${sec.complete ? 'badge--ready' : 'badge--draft'}" style="font-size:10px;">
          ${sec.complete ? 'Complete' : 'In Progress'}
        </span>
        <svg class="collapse-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="color:var(--text-muted);transition:transform var(--ease-fast);flex-shrink:0;">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      <div class="lesson-section-body">
        <div class="form-group">
          <label class="form-label">Main Content</label>
          <textarea class="form-textarea" placeholder="Develop this point…" rows="4">${sec.content || ''}</textarea>
        </div>
        ${sec.scripture !== undefined ? `
        <div class="form-group">
          <label class="form-label">Scripture Reference</label>
          <input class="form-input scripture-ref-input" type="text" placeholder="e.g. John 3:16" value="${sec.scripture || ''}">
        </div>` : ''}
        ${sec.application !== undefined ? `
        <div class="form-group">
          <label class="form-label">Practical Application</label>
          <textarea class="form-textarea" placeholder="How does this land in daily life?" rows="2">${sec.application || ''}</textarea>
        </div>` : ''}
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <button class="btn btn--ghost btn--sm" onclick="LWSUtils.toast('Illustration added','success')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Illustration
          </button>
          <button class="btn btn--ghost btn--sm" onclick="openAIPanel()">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            AI Assist
          </button>
          <button class="btn btn--ghost btn--sm" onclick="LWSUtils.toast('Section marked complete','success')">Mark Complete</button>
        </div>
      </div>
    </div>`;
}

function getDefaultSections() {
  return [
    { id: 'sec-intro',   type: 'intro',       title: 'Introduction',     content: '', scripture: '', application: '', complete: false },
    { id: 'sec-p1',      type: 'point',       title: 'Point 1',          content: '', scripture: '', application: '', complete: false },
    { id: 'sec-p2',      type: 'point',       title: 'Point 2',          content: '', scripture: '', application: '', complete: false },
    { id: 'sec-p3',      type: 'point',       title: 'Point 3',          content: '', scripture: '', application: '', complete: false },
    { id: 'sec-app',     type: 'application', title: 'Application',      content: '', complete: false },
    { id: 'sec-closing', type: 'closing',     title: 'Closing Charge',   content: '', scripture: '', complete: false },
    { id: 'sec-notes',   type: 'notes',       title: 'Notes / Overflow', content: '', complete: false },
  ];
}

/* ── Panel (AI / Scriptures / Snippets) ── */
function initPanel() {
  const tabs = LWSUtils.qsa('.panel-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.panel;
      LWSUtils.qsa('.panel-content').forEach(p => {
        p.style.display = p.id === `panel-${target}` ? '' : 'none';
      });
    });
  });

  /* Panel toggle on mobile/tablet */
  const toggleBtn = document.getElementById('panel-toggle');
  const panel     = document.getElementById('right-panel');
  if (toggleBtn && panel) {
    toggleBtn.addEventListener('click', () => {
      panel.classList.toggle('closed');
      toggleBtn.setAttribute('aria-expanded', !panel.classList.contains('closed'));
    });
  }

  /* AI action stubs */
  LWSUtils.qsa('.ai-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      showAIResponse(action);
    });
  });
}

function openAIPanel() {
  const panel = document.getElementById('right-panel');
  if (panel) panel.classList.remove('closed');
  /* Activate AI tab */
  LWSUtils.qsa('.panel-tab').forEach(t => t.classList.remove('active'));
  const aiTab = LWSUtils.qs('.panel-tab[data-panel="ai"]');
  if (aiTab) aiTab.click();
}

function showAIResponse(action) {
  const output = LWSUtils.qs('#ai-output');
  if (!output) return;

  const responses = {
    expand:     'Expanding this point... Consider deepening with Hebrews 11:6 — "without faith it is impossible to please God." The emphasis shifts from action to posture: God rewards the one who seeks him.',
    scriptures: 'Related scriptures found: Romans 4:20–21, James 2:17, Mark 9:23, Luke 17:6. These all reinforce active, spoken faith over passive belief.',
    refine:     'Refined version: "Faith is not the absence of doubt — it is the decision to move forward despite it. The act of confession transforms internal belief into external momentum."',
    outline:    'Preach outline:\n1. Define the gap between belief and confession\n2. The precedent: Romans 10:9\n3. What stops us from speaking it?\n4. Practical exercise: speak it this week',
    questions:  'Discussion questions:\n• What is one thing you believe but have never said out loud?\n• How does confession change your relationship to a promise?\n• When has speaking your faith shifted your circumstance?',
    summarize:  'Section summary: This point explores the theology of spoken faith — the idea that God's promises activate through agreement, not just passive reception.',
    transition: 'Transition suggestion: "So if confession is the ignition, what is the fuel? Let\'s talk about the Word itself — the source that gives our confession its authority."',
  };

  const labels = {
    expand:     'Expanding point…',
    scriptures: 'Finding scriptures…',
    refine:     'Refining wording…',
    outline:    'Building outline…',
    questions:  'Generating questions…',
    summarize:  'Summarizing section…',
    transition: 'Suggesting transition…',
  };

  output.style.display = '';
  output.querySelector('.ai-response-label').textContent = labels[action] || 'Processing…';
  output.querySelector('.ai-response-text').textContent = '';

  /* Simulate streaming */
  const text = responses[action] || 'AI is ready — connect your OpenAI key in Settings to unlock full writing assistance.';
  let i = 0;
  const interval = setInterval(() => {
    output.querySelector('.ai-response-text').textContent += text[i] || '';
    i++;
    if (i >= text.length) clearInterval(interval);
  }, 18);
}

/* ── Autosave ── */
function initAutosave() {
  const indicator = LWSUtils.qs('#autosave-indicator');
  const inputs    = LWSUtils.qsa('input, textarea');
  inputs.forEach(input => {
    input.addEventListener('input', () => LWSApp.triggerAutosave(indicator));
  });
}

/* ── Export ── */
function initExportButtons() {
  LWSUtils.qsa('[data-export]').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.export;
      LWSUtils.toast(`${type} export — architecture ready, PDF engine integrates here`, 'default');
    });
  });
}

window.init_lesson_builder = init_lesson_builder;
window.openAIPanel         = openAIPanel;
window.scrollToSection     = scrollToSection;
