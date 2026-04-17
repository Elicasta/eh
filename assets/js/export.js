/* Living Word Studio — Export Module
 *
 * Handles:
 * - PDF export via html2pdf.js (loaded from CDN)
 * - Notion-formatted text export (copy/paste workflow)
 */

const LWSExport = (() => {

  /* ══════════════════════════════════════
     NOTION / TEXT EXPORT
  ══════════════════════════════════════ */

  function buildNotionText(lesson) {
    const lines = [];
    const date  = lesson.datePreached
      ? LWSUtils.formatDate(lesson.datePreached)
      : LWSUtils.formatDate(lesson.lastEdited || lesson.dateCreated);

    lines.push(`# ${lesson.title}`);
    lines.push('');
    lines.push(`**Status:** ${LWSUtils.statusLabel(lesson.status)}`);
    lines.push(`**Series:** ${lesson.seriesTitle || 'Standalone'}`);
    lines.push(`**Date:** ${date}`);
    if (lesson.tags && lesson.tags.length) {
      lines.push(`**Tags:** ${lesson.tags.join(', ')}`);
    }
    lines.push('');
    lines.push('---');

    /* Main Burden */
    if (lesson.burden) {
      lines.push('');
      lines.push('## Main Burden');
      lines.push('');
      lines.push(`> ${lesson.burden}`);
    }

    /* Core Scripture */
    if (lesson.coreScripture) {
      lines.push('');
      lines.push('## Core Scripture');
      lines.push('');
      lines.push(lesson.coreScripture);
    }

    /* Supporting Scriptures */
    const supporting = Array.isArray(lesson.supporting)
      ? lesson.supporting
      : (lesson.supporting || '').split(',').map(s => s.trim()).filter(Boolean);

    if (supporting.length) {
      lines.push('');
      lines.push('## Supporting Scriptures');
      lines.push('');
      supporting.forEach(ref => lines.push(`- ${ref}`));
    }

    /* Teaching Sections */
    const sections = lesson.sections || [];
    if (sections.length) {
      lines.push('');
      lines.push('## Teaching Sections');
      sections.forEach((sec, i) => {
        lines.push('');
        lines.push(`### ${sec.title || `Section ${i + 1}`}`);
        if (sec.content)     { lines.push(''); lines.push(sec.content); }
        if (sec.scripture)   { lines.push(''); lines.push(`📖 *${sec.scripture}*`); }
        if (sec.application) { lines.push(''); lines.push(`**Application:** ${sec.application}`); }
      });
    }

    /* Illustrations */
    if (lesson.illustrations) {
      lines.push('');
      lines.push('## Illustrations');
      lines.push('');
      lines.push(lesson.illustrations);
    }

    /* Applications */
    if (lesson.applications) {
      lines.push('');
      lines.push('## Applications');
      lines.push('');
      lines.push(lesson.applications);
    }

    /* Closing Charge */
    if (lesson.closingCharge) {
      lines.push('');
      lines.push('## Closing Charge');
      lines.push('');
      lines.push(`> ${lesson.closingCharge}`);
    }

    /* Notes */
    if (lesson.notes) {
      lines.push('');
      lines.push('## Notes / Overflow');
      lines.push('');
      lines.push(lesson.notes);
    }

    lines.push('');
    lines.push('---');
    lines.push('*Exported from Living Word Studio*');

    return lines.join('\n');
  }

  async function copyForNotion(lesson) {
    const text = buildNotionText(lesson);
    try {
      await navigator.clipboard.writeText(text);
      return { success: true, text };
    } catch {
      return { success: false, text };
    }
  }

  function showNotionModal(lesson) {
    const text    = buildNotionText(lesson);
    let modal     = document.getElementById('notion-export-modal');
    let overlay   = document.getElementById('notion-overlay');

    if (!modal) {
      overlay = _createEl('div', {
        id:    'notion-overlay',
        class: 'overlay',
        style: 'z-index:500',
      });
      modal = _createEl('div', {
        id:    'notion-export-modal',
        class: 'modal',
        style: 'max-width:680px',
      });
      modal.innerHTML = `
        <div class="modal-header">
          <div class="modal-title">Export for Notion</div>
          <button class="btn btn--ghost btn--icon-sm" onclick="document.getElementById('notion-overlay').style.display='none'" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal-body" style="gap:12px;">
          <p style="font-size:13px;color:var(--text-muted);">Copy this text and paste it into any Notion page. It will render as formatted blocks.</p>
          <textarea id="notion-text-output" class="form-textarea" style="min-height:320px;font-family:var(--font-ui);font-size:12px;line-height:1.6;"></textarea>
        </div>
        <div class="modal-footer">
          <button class="btn btn--ghost" onclick="document.getElementById('notion-overlay').style.display='none'">Close</button>
          <button class="btn btn--primary" id="notion-copy-btn" onclick="LWSExport._doCopy()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            Copy for Notion
          </button>
        </div>`;
      overlay.appendChild(modal);
      document.body.appendChild(overlay);
      overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.style.display = 'none';
      });
    }

    document.getElementById('notion-text-output').value = text;
    overlay.style.display = 'flex';
    overlay._text = text;
  }

  async function _doCopy() {
    const textarea = document.getElementById('notion-text-output');
    const btn      = document.getElementById('notion-copy-btn');
    const text     = textarea ? textarea.value : '';
    try {
      await navigator.clipboard.writeText(text);
      if (btn) {
        const orig = btn.innerHTML;
        btn.innerHTML = '✓ Copied!';
        btn.style.background = 'var(--status-ready)';
        setTimeout(() => { btn.innerHTML = orig; btn.style.background = ''; }, 2200);
      }
    } catch {
      /* Fallback: select textarea for manual copy */
      if (textarea) { textarea.select(); document.execCommand('copy'); }
      LWSUtils.toast('Select all text in the box and copy manually', 'default');
    }
  }

  /* ══════════════════════════════════════
     PDF EXPORT
  ══════════════════════════════════════ */

  function _ensureHtml2Pdf() {
    return new Promise((resolve, reject) => {
      if (typeof html2pdf !== 'undefined') { resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload  = resolve;
      script.onerror = () => reject(new Error('html2pdf.js failed to load'));
      document.head.appendChild(script);
    });
  }

  function _buildPDFHtml(lesson, type = 'full') {
    const date = lesson.datePreached
      ? LWSUtils.formatDate(lesson.datePreached)
      : LWSUtils.formatDate(lesson.lastEdited || lesson.dateCreated);

    const supporting = Array.isArray(lesson.supporting)
      ? lesson.supporting.join(' · ')
      : lesson.supporting || '';

    const sections = lesson.sections || [];

    const sectionHTML = sections.map((sec, i) => `
      <div style="margin-bottom:20px;">
        <h3 style="font-size:14px;font-weight:700;color:#1a1a1a;margin:0 0 6px;border-bottom:1px solid #e0e0e0;padding-bottom:4px;">
          ${i + 1}. ${sec.title || `Point ${i + 1}`}
        </h3>
        ${sec.content ? `<p style="margin:6px 0;font-size:12px;line-height:1.7;color:#333;">${sec.content}</p>` : ''}
        ${sec.scripture ? `<p style="margin:6px 0;font-size:11px;color:#6b6b6b;font-style:italic;border-left:2px solid #cc5500;padding-left:8px;">${sec.scripture}</p>` : ''}
        ${type === 'full' && sec.application ? `<p style="margin:6px 0;font-size:11px;color:#555;"><strong>Application:</strong> ${sec.application}</p>` : ''}
      </div>`).join('');

    const fullContent = type === 'full' ? `
      ${lesson.burden ? `
        <div style="background:#fff8f3;border-left:3px solid #cc5500;padding:12px 16px;margin-bottom:20px;border-radius:4px;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#cc5500;margin-bottom:6px;">Main Burden</div>
          <p style="font-size:12px;line-height:1.7;color:#333;margin:0;font-style:italic;">${lesson.burden}</p>
        </div>` : ''}
      ${lesson.coreScripture ? `
        <div style="margin-bottom:16px;">
          <strong style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#666;">Core Scripture</strong>
          <p style="font-size:13px;color:#1a1a1a;margin:4px 0;">${lesson.coreScripture}</p>
        </div>` : ''}
      ${supporting ? `
        <div style="margin-bottom:20px;">
          <strong style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#666;">Supporting Scriptures</strong>
          <p style="font-size:12px;color:#444;margin:4px 0;">${supporting}</p>
        </div>` : ''}
      <div style="margin-bottom:16px;">
        <h2 style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#666;margin:0 0 12px;">Teaching Sections</h2>
        ${sectionHTML}
      </div>
      ${lesson.illustrations ? `
        <div style="margin-bottom:16px;">
          <h3 style="font-size:12px;font-weight:700;color:#444;margin:0 0 6px;">Illustrations</h3>
          <p style="font-size:12px;line-height:1.7;color:#333;">${lesson.illustrations}</p>
        </div>` : ''}
      ${lesson.applications ? `
        <div style="margin-bottom:16px;">
          <h3 style="font-size:12px;font-weight:700;color:#444;margin:0 0 6px;">Applications</h3>
          <p style="font-size:12px;line-height:1.7;color:#333;">${lesson.applications}</p>
        </div>` : ''}
      ${lesson.closingCharge ? `
        <div style="background:#fff8f3;border-left:3px solid #cc5500;padding:12px 16px;border-radius:4px;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#cc5500;margin-bottom:6px;">Closing Charge</div>
          <p style="font-size:13px;line-height:1.7;color:#1a1a1a;margin:0;font-style:italic;">${lesson.closingCharge}</p>
        </div>` : ''}
    ` : `
      <!-- Preach Outline: points only -->
      ${lesson.coreScripture ? `<p style="font-size:13px;font-style:italic;color:#444;margin-bottom:16px;">📖 ${lesson.coreScripture}</p>` : ''}
      ${lesson.burden ? `<div style="background:#fff8f3;border-left:3px solid #cc5500;padding:10px 14px;margin-bottom:16px;font-style:italic;font-size:12px;color:#333;">${lesson.burden}</div>` : ''}
      ${sectionHTML}
      ${lesson.closingCharge ? `<div style="border-top:1px solid #eee;padding-top:12px;margin-top:8px;font-style:italic;font-size:12px;color:#444;"><strong>Closing:</strong> ${lesson.closingCharge}</div>` : ''}
    `;

    return `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:700px;margin:0 auto;padding:32px;color:#1a1a1a;">
        <div style="border-bottom:2px solid #cc5500;padding-bottom:16px;margin-bottom:24px;">
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#cc5500;margin-bottom:6px;">
            Living Word Studio ${type === 'full' ? '· Full Lesson' : '· Preach Outline'}
          </div>
          <h1 style="font-size:26px;font-weight:800;color:#0a0a0a;margin:0 0 6px;line-height:1.2;">${lesson.title}</h1>
          ${lesson.subtitle ? `<p style="font-size:14px;color:#555;margin:0 0 8px;font-style:italic;">${lesson.subtitle}</p>` : ''}
          <div style="font-size:11px;color:#888;">${lesson.seriesTitle || 'Standalone'} &nbsp;·&nbsp; ${date}</div>
        </div>
        ${fullContent}
        <div style="margin-top:40px;padding-top:12px;border-top:1px solid #eee;font-size:10px;color:#aaa;text-align:right;">
          Living Word Studio · ${new Date().toLocaleDateString()}
        </div>
      </div>`;
  }

  async function exportPDF(lesson, type = 'full') {
    try {
      await _ensureHtml2Pdf();
    } catch {
      LWSUtils.toast('PDF library failed to load. Check your connection.', 'error');
      return;
    }

    const html     = _buildPDFHtml(lesson, type);
    const filename = `${lesson.title.replace(/[^a-z0-9 ]/gi, '').trim()} - ${type === 'full' ? 'Full Lesson' : 'Preach Outline'}.pdf`;

    LWSUtils.toast('Generating PDF…', 'default', 2000);

    const element = document.createElement('div');
    element.innerHTML = html;
    element.style.cssText = 'position:absolute;left:-9999px;top:0;';
    document.body.appendChild(element);

    try {
      await html2pdf()
        .set({
          margin:      [12, 12, 12, 12],
          filename,
          image:       { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak:   { mode: ['avoid-all', 'css', 'legacy'] },
        })
        .from(element)
        .save();

      LWSUtils.toast('PDF exported', 'success');

      /* Mark lesson as exported */
      const stored = LWSStorage.getLesson(lesson.id);
      if (stored) {
        stored.pdfExported = true;
        LWSStorage.saveLesson(stored);
      }
    } catch (err) {
      console.error('PDF export error:', err);
      LWSUtils.toast('PDF export failed. Try again.', 'error');
    } finally {
      document.body.removeChild(element);
    }
  }

  /* ── Utility ── */

  function _createEl(tag, attrs = {}) {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') el.className = v;
      else               el.setAttribute(k, v);
    });
    return el;
  }

  return {
    buildNotionText,
    copyForNotion,
    showNotionModal,
    exportPDF,
    _doCopy,
  };

})();
