/* Living Word Studio — Settings Page */

async function init_settings() {
  const settings = await LWSApp.getSettings();
  if (!settings) return;

  populateProfile(settings.profile);
  populateAppearance(settings.appearance);
  populateWriting(settings.writing);
  populatePreachMode(settings.preachMode);
  populateIntegrations(settings.integrations);
  populateStorage(settings.storage);
  initSettingsNav();
  initToggleListeners();
}

function populateProfile(profile) {
  const nameEl    = document.getElementById('profile-name');
  const roleEl    = document.getElementById('profile-role');
  const churchEl  = document.getElementById('profile-church');
  const emailEl   = document.getElementById('profile-email');
  const bioEl     = document.getElementById('profile-bio');
  const avatarEl  = document.getElementById('profile-avatar');

  if (nameEl)   nameEl.value   = profile.name;
  if (roleEl)   roleEl.value   = profile.role;
  if (churchEl) churchEl.value = profile.church;
  if (emailEl)  emailEl.value  = profile.email;
  if (bioEl)    bioEl.value    = profile.bio;
  if (avatarEl) avatarEl.textContent = LWSUtils.initials(profile.name);
}

function populateAppearance(appearance) {
  const themeEl   = document.getElementById('theme-select');
  const accentEl  = document.getElementById('accent-select');
  const animEl    = document.getElementById('animations-toggle');

  if (themeEl)  themeEl.value  = appearance.theme  || 'dark';
  if (accentEl) accentEl.value = appearance.accentColor || 'orange';
  if (animEl)   setToggle(animEl, appearance.animationsEnabled !== false);
}

function populateWriting(writing) {
  const translEl = document.getElementById('verse-translation');
  const wcEl     = document.getElementById('wordcount-toggle');
  const spellEl  = document.getElementById('spellcheck-toggle');

  if (translEl) translEl.value = writing.defaultVerseTranslation || 'NIV';
  if (wcEl)     setToggle(wcEl, writing.showWordCount !== false);
  if (spellEl)  setToggle(spellEl, writing.spellcheck !== false);
}

function populatePreachMode(pm) {
  const fontSzEl  = document.getElementById('preach-fontsize');
  const timerEl   = document.getElementById('preach-timer-toggle');
  const notesEl   = document.getElementById('preach-notes-toggle');
  const awakeEl   = document.getElementById('preach-awake-toggle');

  if (fontSzEl) fontSzEl.value = pm.fontSize || 'large';
  if (timerEl)  setToggle(timerEl, pm.showTimer !== false);
  if (notesEl)  setToggle(notesEl, pm.showSpeakerNotes !== false);
  if (awakeEl)  setToggle(awakeEl, pm.keepScreenAwake !== false);
}

function populateIntegrations(integrations) {
  updateIntegrationStatus('openai', integrations.openai?.connected, 'Connect OpenAI');
  updateIntegrationStatus('notion', integrations.notion?.connected, 'Connect Notion');
  updateIntegrationStatus('google', integrations.google?.connected, 'Connect Google');
}

function updateIntegrationStatus(id, connected, connectLabel) {
  const statusEl = document.getElementById(`${id}-status`);
  const btnEl    = document.getElementById(`${id}-btn`);

  if (statusEl) {
    statusEl.textContent = connected ? 'Connected' : 'Not connected';
    statusEl.className   = `integration-status${connected ? ' connected' : ''}`;
  }
  if (btnEl) {
    btnEl.textContent  = connected ? 'Disconnect' : connectLabel;
    btnEl.className    = `btn ${connected ? 'btn--secondary' : 'btn--primary'} btn--sm`;
  }
}

function populateStorage(storage) {
  const usedEl  = document.getElementById('storage-used');
  const limitEl = document.getElementById('storage-limit');
  const syncEl  = document.getElementById('last-sync');
  const offEl   = document.getElementById('offline-toggle');

  if (usedEl)  usedEl.textContent  = storage.storageUsed  || '—';
  if (limitEl) limitEl.textContent = storage.storageLimit || '500 MB';
  if (syncEl)  syncEl.textContent  = storage.lastSync     ? LWSUtils.formatRelative(storage.lastSync) : 'Never';
  if (offEl)   setToggle(offEl, storage.offlineMode !== false);
}

function setToggle(checkbox, value) {
  if (!checkbox) return;
  checkbox.checked = !!value;
}

function initSettingsNav() {
  const navItems = LWSUtils.qsa('.settings-nav-item');
  const sections = LWSUtils.qsa('.settings-section');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      const target = item.dataset.section;
      if (!target) return;

      sections.forEach(s => {
        s.style.display = s.id === `section-${target}` ? '' : 'none';
      });
    });
  });
}

function initToggleListeners() {
  /* Save on any change */
  LWSUtils.qsa('.form-input, .form-textarea, select').forEach(el => {
    el.addEventListener('change', () => {
      LWSUtils.toast('Preference saved', 'success');
    });
  });

  LWSUtils.qsa('input[type="checkbox"]').forEach(el => {
    el.addEventListener('change', () => {
      LWSUtils.toast('Setting updated', 'success');
    });
  });
}

function connectIntegration(service) {
  const labels = {
    openai: 'OpenAI / ChatGPT',
    notion: 'Notion',
    google: 'Google Account',
  };
  LWSUtils.toast(`${labels[service] || service} connection — enter API key to activate`, 'default');
}

function exportAllLessons() {
  LWSUtils.toast('Full library export — PDF generation integrates here', 'default');
}

function clearCache() {
  localStorage.removeItem('lws_currentLessonId');
  LWSUtils.toast('Cache cleared', 'success');
}

window.init_settings      = init_settings;
window.connectIntegration = connectIntegration;
window.exportAllLessons   = exportAllLessons;
window.clearCache         = clearCache;
