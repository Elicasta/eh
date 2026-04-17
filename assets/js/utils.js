/* Living Word Studio — Utility Functions */

const LWSUtils = (() => {

  /* ── Date & Time ── */

  function formatDate(dateStr, options = {}) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const defaults = { month: 'short', day: 'numeric', year: 'numeric' };
    return d.toLocaleDateString('en-US', { ...defaults, ...options });
  }

  function formatRelative(dateStr) {
    if (!dateStr) return '';
    const now  = new Date();
    const then = new Date(dateStr);
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60)     return 'just now';
    if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return formatDate(dateStr);
  }

  function formatTime(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
  }

  function getDayName(dateStr, format = 'short') {
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: format });
  }

  function getMonthName(month, format = 'long') {
    return new Date(2000, month, 1).toLocaleDateString('en-US', { month: format });
  }

  function todayStr() {
    return new Date().toISOString().split('T')[0];
  }

  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  /* ── DOM Helpers ── */

  function el(tag, props = {}, ...children) {
    const elem = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
      if (k === 'class')       elem.className = v;
      else if (k === 'html')   elem.innerHTML = v;
      else if (k === 'text')   elem.textContent = v;
      else if (k.startsWith('on')) elem.addEventListener(k.slice(2), v);
      else                     elem.setAttribute(k, v);
    });
    children.forEach(child => {
      if (!child) return;
      if (typeof child === 'string') elem.appendChild(document.createTextNode(child));
      else elem.appendChild(child);
    });
    return elem;
  }

  function qs(selector, root = document) {
    return root.querySelector(selector);
  }

  function qsa(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function show(elem) { if (elem) elem.style.display = ''; }
  function hide(elem) { if (elem) elem.style.display = 'none'; }

  function fadeIn(elem, duration = 240) {
    if (!elem) return;
    elem.style.opacity = '0';
    elem.style.transform = 'translateY(6px)';
    elem.style.transition = `opacity ${duration}ms ease, transform ${duration}ms ease`;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        elem.style.opacity = '1';
        elem.style.transform = 'translateY(0)';
      });
    });
  }

  function staggerFadeIn(elements, stagger = 60) {
    elements.forEach((el, i) => {
      setTimeout(() => fadeIn(el), i * stagger);
    });
  }

  /* ── String Helpers ── */

  function truncate(str, len = 120) {
    if (!str || str.length <= len) return str;
    return str.slice(0, len).trim() + '\u2026';
  }

  function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function initials(name) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  /* ── Status Helpers ── */

  function statusLabel(status) {
    const map = {
      draft:      'Draft',
      in_progress:'In Progress',
      ready:      'Ready',
      preached:   'Preached',
      archived:   'Archived',
      planning:   'Planning',
    };
    return map[status] || status;
  }

  function statusBadgeClass(status) {
    const map = {
      draft:      'badge--draft',
      in_progress:'badge--progress',
      ready:      'badge--ready',
      preached:   'badge--preached',
      archived:   'badge--archived',
    };
    return map[status] || 'badge--draft';
  }

  function snippetTypeIcon(type) {
    const icons = {
      thought:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
      scripture:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
      illustration:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
      'title-idea':`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
      link:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
      quote:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>`,
      question:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    };
    return icons[type] || icons.thought;
  }

  /* ── Local Storage ── */

  function lsGet(key, fallback = null) {
    try {
      const v = localStorage.getItem(`lws_${key}`);
      return v ? JSON.parse(v) : fallback;
    } catch { return fallback; }
  }

  function lsSet(key, value) {
    try { localStorage.setItem(`lws_${key}`, JSON.stringify(value)); }
    catch (e) { console.warn('LWS: localStorage write failed', e); }
  }

  /* ── Toast ── */

  function toast(message, type = 'default', duration = 3000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = el('div', { id: 'toast-container', class: 'toast-container' });
      document.body.appendChild(container);
    }

    const t = el('div', { class: `toast toast--${type}`, text: message });
    container.appendChild(t);
    fadeIn(t, 180);

    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateY(4px)';
      setTimeout(() => t.remove(), 300);
    }, duration);
  }

  /* ── Number helpers ── */
  function formatNumber(n) {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  /* ── Debounce ── */
  function debounce(fn, delay = 300) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  }

  return {
    formatDate, formatRelative, formatTime, getDayName,
    getMonthName, todayStr, greeting,
    el, qs, qsa, show, hide, fadeIn, staggerFadeIn,
    truncate, slugify, initials,
    statusLabel, statusBadgeClass, snippetTypeIcon,
    lsGet, lsSet, toast, formatNumber, debounce
  };
})();
