/* Living Word Studio — Local Storage Layer
 *
 * Single source of truth for all runtime data.
 * Seeds from JSON files on first load, then persists locally.
 * All operations are synchronous (localStorage) for simplicity.
 */

const LWSStorage = (() => {

  /* ── Storage keys ── */
  const K = {
    LESSONS:  'lws:lessons',
    SNIPPETS: 'lws:snippets',
    EVENTS:   'lws:events',
    SETTINGS: 'lws:settings',
    SERIES:   'lws:series',
    VIDEOS:   'lws:videos',
    SEEDED:   'lws:seeded',
  };

  /* ── Generic read / write ── */

  function read(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function write(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('LWSStorage: write failed for', key, e);
      return false;
    }
  }

  /* ── Lessons ── */

  function getLessons()   { return read(K.LESSONS, []); }
  function getLesson(id)  { return getLessons().find(l => l.id === id) || null; }

  function saveLesson(lesson) {
    const all = getLessons();
    const idx = all.findIndex(l => l.id === lesson.id);
    const updated = {
      ...lesson,
      lastEdited: new Date().toISOString(),
    };
    if (idx >= 0) all[idx] = { ...all[idx], ...updated };
    else          all.unshift(updated);
    return write(K.LESSONS, all);
  }

  function deleteLesson(id) {
    return write(K.LESSONS, getLessons().filter(l => l.id !== id));
  }

  function createLesson(overrides = {}) {
    const id = 'l' + Date.now();
    const blank = {
      id,
      title:               'Untitled Lesson',
      subtitle:            '',
      seriesId:            null,
      seriesTitle:         'Standalone',
      status:              'draft',
      progress:            0,
      coreScripture:       '',
      supporting:          [],
      burden:              '',
      sections:            defaultSections(),
      illustrations:       '',
      applications:        '',
      closingCharge:       '',
      notes:               '',
      tags:                [],
      linkedEventId:       null,
      dateCreated:         new Date().toISOString(),
      lastEdited:          new Date().toISOString(),
      datePreached:        null,
      notionSynced:        false,
      pdfExported:         false,
      youtubeLinked:       false,
    };
    const lesson = { ...blank, ...overrides, id };
    saveLesson(lesson);
    return lesson;
  }

  function defaultSections() {
    return [
      { id: 'sec-intro',   type: 'intro',       title: 'Introduction',     content: '', scripture: '', application: '', complete: false },
      { id: 'sec-p1',      type: 'point',       title: 'Point 1',          content: '', scripture: '', application: '', complete: false },
      { id: 'sec-p2',      type: 'point',       title: 'Point 2',          content: '', scripture: '', application: '', complete: false },
      { id: 'sec-p3',      type: 'point',       title: 'Point 3',          content: '', scripture: '', application: '', complete: false },
      { id: 'sec-closing', type: 'closing',     title: 'Closing Charge',   content: '', scripture: '', complete: false },
    ];
  }

  /* ── Snippets ── */

  function getSnippets()     { return read(K.SNIPPETS, []); }
  function getSnippet(id)    { return getSnippets().find(s => s.id === id) || null; }

  function saveSnippet(snippet) {
    const all = getSnippets();
    const idx = all.findIndex(s => s.id === snippet.id);
    if (idx >= 0) all[idx] = { ...all[idx], ...snippet };
    else          all.unshift(snippet);
    return write(K.SNIPPETS, all);
  }

  function deleteSnippet(id) {
    return write(K.SNIPPETS, getSnippets().filter(s => s.id !== id));
  }

  function createSnippet(data) {
    const snippet = {
      id:        'sn' + Date.now(),
      type:      'thought',
      title:     '',
      content:   '',
      tags:      [],
      series:    null,
      saved:     false,
      timestamp: new Date().toISOString(),
      ...data,
    };
    saveSnippet(snippet);
    return snippet;
  }

  /* ── Calendar Events ── */

  function getEvents()    { return read(K.EVENTS, []); }
  function getEvent(id)   { return getEvents().find(e => e.id === id) || null; }

  function saveEvent(event) {
    const all = getEvents();
    const idx = all.findIndex(e => e.id === event.id);
    if (idx >= 0) all[idx] = { ...all[idx], ...event };
    else          all.unshift(event);
    return write(K.EVENTS, all);
  }

  function deleteEvent(id) {
    return write(K.EVENTS, getEvents().filter(e => e.id !== id));
  }

  function createEvent(data) {
    const event = {
      id:            'ev' + Date.now(),
      title:         'New Event',
      type:          'study',
      date:          LWSUtils.todayStr(),
      time:          '19:00',
      duration:      60,
      location:      '',
      notes:         '',
      linkedLessonId:null,
      prepStatus:    'planning',
      recurring:     null,
      ...data,
    };
    saveEvent(event);
    return event;
  }

  /* ── Settings ── */

  function getSettings()        { return read(K.SETTINGS, defaultSettings()); }
  function saveSettings(delta)  {
    const current = getSettings();
    const merged  = deepMerge(current, delta);
    return write(K.SETTINGS, merged);
  }

  function defaultSettings() {
    return {
      profile: {
        name:   'Pastor',
        role:   'Lead Pastor',
        church: '',
        email:  '',
        bio:    '',
      },
      writing: {
        defaultVerseTranslation: 'KJV',
        autosaveInterval:        30,
        showWordCount:           true,
        spellcheck:              true,
      },
      preachMode: {
        fontSize:         'large',
        theme:            'dark',
        showTimer:        true,
        keepScreenAwake:  true,
        showSpeakerNotes: true,
      },
      appearance: {
        theme:             'dark',
        accentColor:       'orange',
        animationsEnabled: true,
        sidebarCollapsed:  false,
      },
      ai: {
        enabled:   false,
        modelId:   'Phi-3.5-mini-instruct-q4f16_1-MLC',
        autoLoad:  false,
      },
      storage: {
        offlineMode:    true,
        autosaveLocal:  true,
      },
    };
  }

  function deepMerge(target, source) {
    const out = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        out[key] = deepMerge(target[key] || {}, source[key]);
      } else {
        out[key] = source[key];
      }
    }
    return out;
  }

  /* ── Series ── */

  function getSeries()     { return read(K.SERIES, []); }
  function saveSeries(arr) { return write(K.SERIES, arr); }

  function getSeriesById(id) {
    return getSeries().find(s => s.id === id) || null;
  }

  /* ── Derived / helpers ── */

  function getLessonProgress(lesson) {
    if (!lesson.sections || !lesson.sections.length) return 0;
    const done = lesson.sections.filter(s => s.complete).length;
    return Math.round((done / lesson.sections.length) * 100);
  }

  function updateLessonProgress(lessonId) {
    const lesson = getLesson(lessonId);
    if (!lesson) return;
    lesson.progress = getLessonProgress(lesson);
    saveLesson(lesson);
  }

  /* ── Seed from JSON on first run ── */

  async function seed() {
    if (read(K.SEEDED)) return;

    const load = async (path) => {
      try {
        const r = await fetch(path);
        if (!r.ok) throw new Error(r.status);
        return r.json();
      } catch { return null; }
    };

    const [lessons, snippets, events, series, settings] = await Promise.all([
      load('assets/data/lessons.json'),
      load('assets/data/snippets.json'),
      load('assets/data/calendar.json'),
      load('assets/data/series.json'),
      load('assets/data/settings.json'),
    ]);

    if (lessons  && !read(K.LESSONS))  write(K.LESSONS,  lessons);
    if (snippets && !read(K.SNIPPETS)) write(K.SNIPPETS, snippets);
    if (events   && !read(K.EVENTS))   write(K.EVENTS,   events);
    if (series   && !read(K.SERIES))   write(K.SERIES,   series);
    if (settings && !read(K.SETTINGS)) {
      write(K.SETTINGS, deepMerge(defaultSettings(), settings));
    }

    write(K.SEEDED, true);
  }

  /* Reset all local data (useful for development / reset) */
  function reset(andReseed = false) {
    Object.values(K).forEach(k => localStorage.removeItem(k));
    if (andReseed) seed();
  }

  return {
    /* Lessons */
    getLessons, getLesson, saveLesson, deleteLesson, createLesson,
    defaultSections,
    /* Snippets */
    getSnippets, getSnippet, saveSnippet, deleteSnippet, createSnippet,
    /* Events */
    getEvents, getEvent, saveEvent, deleteEvent, createEvent,
    /* Settings */
    getSettings, saveSettings,
    /* Series */
    getSeries, saveSeries, getSeriesById,
    /* Utilities */
    getLessonProgress, updateLessonProgress,
    seed, reset,
    _read: read, _write: write, K,
  };

})();
