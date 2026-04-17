/* Living Word Studio — In-Browser AI Assistant
 *
 * Uses WebLLM (https://webllm.mlc.ai/) for local inference via WebGPU.
 * Loads lazily — never blocks the app on startup.
 * Degrades gracefully when browser/device doesn't support WebGPU.
 */

const LWSAIAssist = (() => {

  /* ── State ── */
  let _engine         = null;
  let _state          = 'idle';  // idle | loading | ready | failed | unsupported
  let _loadProgress   = 0;
  let _onStateChange  = null;    // callback(state, progress, message)
  let _modelId        = 'Phi-3.5-mini-instruct-q4f16_1-MLC';

  const MODELS = [
    { id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',        label: 'Phi 3.5 Mini (recommended, ~2.4GB)' },
    { id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',        label: 'Llama 3.2 1B (lighter, ~0.8GB)'     },
    { id: 'gemma-2-2b-it-q4f16_1-MLC',                label: 'Gemma 2 2B (~1.4GB)'                },
    { id: 'SmolLM2-1.7B-Instruct-q4f16_1-MLC',        label: 'SmolLM2 1.7B (smallest, ~1GB)'      },
  ];

  /* ── WebGPU support check ── */
  async function checkSupport() {
    if (!navigator.gpu) {
      return { supported: false, reason: 'WebGPU is not available in this browser. Try Chrome 113+ or Edge 113+.' };
    }
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        return { supported: false, reason: 'No WebGPU-capable GPU found on this device.' };
      }
      return { supported: true };
    } catch (e) {
      return { supported: false, reason: `WebGPU check failed: ${e.message}` };
    }
  }

  /* ── Initialize / load model ── */
  async function init(modelId, onProgress) {
    if (_state === 'loading') return;
    if (_state === 'ready')   return;

    _modelId = modelId || _modelId;

    /* Check WebGPU first */
    const support = await checkSupport();
    if (!support.supported) {
      _state = 'unsupported';
      _notify(support.reason);
      return;
    }

    _state = 'loading';
    _notify('Loading model\u2026');

    try {
      /* Dynamic import of WebLLM from CDN */
      const webllm = await import('https://esm.run/@mlc-ai/web-llm');

      _engine = await webllm.CreateMLCEngine(_modelId, {
        initProgressCallback: (progress) => {
          _loadProgress = Math.round((progress.progress || 0) * 100);
          const msg = progress.text || `Loading\u2026 ${_loadProgress}%`;
          _notify(msg, _loadProgress);
          if (onProgress) onProgress(_loadProgress, msg);
        },
      });

      _state = 'ready';
      _notify('AI ready');
    } catch (err) {
      console.error('LWSAIAssist: init failed', err);
      _state = 'failed';
      _notify(err.message || 'Model failed to load');
    }
  }

  /* ── Generate response ── */
  async function generate(prompt, opts = {}) {
    if (_state !== 'ready' || !_engine) {
      throw new Error('AI is not loaded. Click "Load AI" to initialize.');
    }

    const system = opts.system || `You are a helpful sermon writing assistant for a pastor.
Be concise, scriptural, and practical. Focus on clarity and depth.
Always ground suggestions in the context of biblical truth.`;

    const messages = [
      { role: 'system', content: system },
      { role: 'user',   content: prompt },
    ];

    const response = await _engine.chat.completions.create({
      messages,
      max_tokens:   opts.maxTokens   || 400,
      temperature:  opts.temperature || 0.7,
      stream:       false,
    });

    return response.choices[0]?.message?.content?.trim() || '';
  }

  /* ── Task helpers ── */

  const tasks = {
    async expand(sectionContent, lessonContext) {
      return generate(`Expand this sermon point with more depth and clarity:

Section content: "${sectionContent}"
${lessonContext ? `Lesson title: "${lessonContext.title}"` : ''}
${lessonContext?.coreScripture ? `Core scripture: ${lessonContext.coreScripture}` : ''}

Write 2\u20133 paragraphs that deepen this point. Keep it pastoral and grounded in scripture.`);
    },

    async findScriptures(topic, existing = []) {
      return generate(`Suggest 4\u20136 KJV Bible scriptures that support this sermon topic or point:

Topic: "${topic}"
${existing.length ? `Already using: ${existing.join(', ')}` : ''}

List only scripture references with a one-sentence explanation of each. Format:
- Reference \u2014 explanation`);
    },

    async refine(text) {
      return generate(`Refine and improve this sermon text for clarity, rhythm, and preachability:

"${text}"

Improve the wording while preserving the theological intent. Keep it punchy and memorable.`);
    },

    async preachOutline(sections, lessonTitle) {
      const sectionList = sections.map((s, i) => `${i + 1}. ${s.title}: ${s.content || '(no content yet)'}`).join('\n');
      return generate(`Convert these sermon sections into a clean preach outline for ${lessonTitle || 'this lesson'}:

${sectionList}

Format as a clean 3-point outline with sub-points. Include transition phrases between points.`);
    },

    async discussionQuestions(lessonContext) {
      return generate(`Create 5 thought-provoking discussion questions for a Bible study based on this lesson:

Title: "${lessonContext.title || 'Untitled'}"
Core scripture: ${lessonContext.coreScripture || 'N/A'}
Main burden: ${lessonContext.burden || 'N/A'}

Write questions that spark honest reflection and practical application. Vary depth from personal to theological.`);
    },

    async summarize(content) {
      return generate(`Write a 2\u20133 sentence summary of this sermon section:

"${content}"

Make it clear, memorable, and suitable as a pull quote or key takeaway.`);
    },

    async suggestTransition(fromSection, toSection) {
      return generate(`Write a smooth transition sentence connecting these two sermon points:

From: "${fromSection}"
To: "${toSection}"

The transition should feel natural, intentional, and keep the listener engaged.`);
    },
  };

  /* ── Notify state listeners ── */
  function _notify(message = '', progress = 0) {
    if (_onStateChange) {
      _onStateChange({ state: _state, message, progress });
    }
    /* Update any visible AI panels */
    _updatePanelUI({ state: _state, message, progress });
  }

  /* ── Update AI panel in the DOM if present ── */
  function _updatePanelUI({ state, message, progress }) {
    const statusEl   = document.getElementById('ai-status');
    const loadBtn    = document.getElementById('ai-load-btn');
    const progressEl = document.getElementById('ai-progress');
    const actionsEl  = document.getElementById('ai-actions');
    const unsupEl    = document.getElementById('ai-unsupported');

    if (statusEl)   statusEl.textContent = message || _stateLabel(state);
    if (progressEl) {
      progressEl.style.display = state === 'loading' ? '' : 'none';
      const bar = progressEl.querySelector('.progress-bar-fill');
      if (bar) bar.style.width = `${progress}%`;
    }
    if (loadBtn) {
      loadBtn.style.display   = (state === 'idle' || state === 'failed') ? '' : 'none';
      loadBtn.disabled        = state === 'loading';
      loadBtn.textContent     = state === 'failed' ? 'Retry Loading AI' : 'Load Local AI';
    }
    if (actionsEl) {
      actionsEl.style.display = state === 'ready' ? '' : 'none';
    }
    if (unsupEl) {
      unsupEl.style.display   = state === 'unsupported' ? '' : 'none';
      if (state === 'unsupported') {
        unsupEl.querySelector('.unsup-msg').textContent = message || 'WebGPU not supported on this device.';
      }
    }
  }

  function _stateLabel(state) {
    return { idle: 'Not loaded', loading: 'Loading model\u2026', ready: 'AI Ready', failed: 'Failed to load', unsupported: 'Not supported' }[state] || state;
  }

  function onStateChange(cb) { _onStateChange = cb; }
  function getState()        { return _state; }
  function getModels()       { return MODELS; }
  function setModel(id)      { _modelId = id; }

  /* ── Build AI panel HTML (injected into lesson builder) ── */
  function buildPanelHTML() {
    return `
      <div class="ai-panel">
        <div class="ai-panel-header">
          <div class="ai-chip">
            <svg viewBox="0 0 24 24" fill="white" width="14" height="14"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <div>
            <div class="ai-panel-title">Local AI Assist</div>
            <div class="ai-panel-sub" id="ai-status">Not loaded · runs in your browser</div>
          </div>
        </div>

        <!-- Model selector -->
        <div style="margin-bottom:12px;">
          <label style="font-size:11px;color:var(--text-muted);display:block;margin-bottom:6px;">Model</label>
          <select class="form-input" id="ai-model-select" style="font-size:12px;" onchange="LWSAIAssist.setModel(this.value)">
            ${MODELS.map(m => `<option value="${m.id}" ${m.id === _modelId ? 'selected' : ''}>${m.label}</option>`).join('')}
          </select>
        </div>

        <!-- Load button -->
        <button id="ai-load-btn" class="btn btn--primary" style="width:100%;margin-bottom:12px;" onclick="LWSAIAssist.init(document.getElementById('ai-model-select')?.value)">
          Load Local AI
        </button>

        <!-- Loading progress -->
        <div id="ai-progress" style="display:none;margin-bottom:12px;">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;" id="ai-progress-text">Downloading model\u2026</div>
          <div class="progress-bar" style="height:6px;">
            <div class="progress-bar-fill" style="width:0%;"></div>
          </div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:4px;">First load downloads the model. Subsequent loads use cache.</div>
        </div>

        <!-- Unsupported message -->
        <div id="ai-unsupported" style="display:none;padding:12px;background:rgba(255,159,10,0.08);border:1px solid rgba(255,159,10,0.2);border-radius:var(--radius-md);margin-bottom:12px;">
          <div style="font-size:12px;font-weight:600;color:#FF9F0A;margin-bottom:4px;">WebGPU Not Available</div>
          <div class="unsup-msg" style="font-size:11px;color:var(--text-muted);line-height:1.5;"></div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:6px;">Try Chrome 113+ or Edge 113+ on a desktop/laptop with a dedicated GPU.</div>
        </div>

        <!-- AI Actions -->
        <div id="ai-actions" style="display:none;">
          <div class="ai-action-list">
            <button class="ai-action-btn" data-action="expand">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="5 9 2 12 5 15"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/></svg>
              Expand this point
            </button>
            <button class="ai-action-btn" data-action="scriptures">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
              Find supporting scriptures
            </button>
            <button class="ai-action-btn" data-action="refine">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
              Refine wording
            </button>
            <button class="ai-action-btn" data-action="outline">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
              Build preach outline
            </button>
            <button class="ai-action-btn" data-action="questions">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              Discussion questions
            </button>
            <button class="ai-action-btn" data-action="summarize">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              Summarize section
            </button>
          </div>

          <!-- AI Output -->
          <div id="ai-output" style="display:none;margin-top:12px;">
            <div style="background:rgba(74,158,255,0.06);border:1px solid rgba(74,158,255,0.15);border-radius:var(--radius-md);padding:14px;position:relative;">
              <div class="ai-response-label" style="font-size:10px;font-weight:700;color:var(--status-progress);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.06em;"></div>
              <div class="ai-response-text" style="font-size:13px;color:var(--text-secondary);line-height:1.65;white-space:pre-wrap;max-height:280px;overflow-y:auto;"></div>
              <div style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end;">
                <button class="btn btn--ghost btn--sm" onclick="document.getElementById('ai-output').style.display='none'">Dismiss</button>
                <button class="btn btn--secondary btn--sm" id="ai-insert-btn" onclick="LWSAIAssist.insertOutput()">Insert into Section</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Info note -->
        <div style="margin-top:12px;font-size:11px;color:var(--text-muted);line-height:1.5;padding:10px;background:var(--bg-elevated);border-radius:var(--radius-md);border:1px solid var(--border-soft);">
          AI runs entirely in your browser. No data is sent to external servers. Model downloads once and is cached locally.
        </div>
      </div>`;
  }

  /* ── Handle AI action button click from lesson builder ── */
  async function handleAction(action, lessonContext, focusedContent) {
    const outputEl  = document.getElementById('ai-output');
    const labelEl   = document.querySelector('.ai-response-label');
    const textEl    = document.querySelector('.ai-response-text');

    if (!outputEl || !labelEl || !textEl) return;

    if (_state !== 'ready') {
      LWSUtils.toast('Load the AI model first', 'default');
      return;
    }

    const labels = {
      expand:     'Expanding point\u2026',
      scriptures: 'Finding scriptures\u2026',
      refine:     'Refining wording\u2026',
      outline:    'Building outline\u2026',
      questions:  'Generating questions\u2026',
      summarize:  'Summarizing\u2026',
      transition: 'Suggesting transition\u2026',
    };

    outputEl.style.display = '';
    labelEl.textContent    = labels[action] || 'Processing\u2026';
    textEl.textContent     = '\u22ef';

    try {
      let result = '';
      const content = focusedContent || lessonContext?.burden || '';

      switch (action) {
        case 'expand':     result = await tasks.expand(content, lessonContext); break;
        case 'scriptures': result = await tasks.findScriptures(content, lessonContext?.supporting || []); break;
        case 'refine':     result = await tasks.refine(content); break;
        case 'outline':    result = await tasks.preachOutline(lessonContext?.sections || [], lessonContext?.title); break;
        case 'questions':  result = await tasks.discussionQuestions(lessonContext); break;
        case 'summarize':  result = await tasks.summarize(content); break;
        default:           result = await generate(content);
      }

      textEl.textContent = result;
      labelEl.textContent = 'Result';
    } catch (err) {
      textEl.textContent = `Error: ${err.message}`;
      labelEl.textContent = 'Failed';
    }
  }

  /* ── Insert last AI output into the focused textarea ── */
  function insertOutput() {
    const textEl = document.querySelector('.ai-response-text');
    if (!textEl) return;
    const result = textEl.textContent;
    if (!result || result === '\u22ef') return;

    /* Find the focused/last active textarea */
    const active = document.activeElement;
    const target = (active && active.tagName === 'TEXTAREA') ? active
      : document.querySelector('.lesson-section-body textarea:first-of-type');

    if (target) {
      const start = target.selectionStart;
      const end   = target.selectionEnd;
      target.value = target.value.slice(0, start) + '\n' + result + '\n' + target.value.slice(end);
      target.dispatchEvent(new Event('input'));
      LWSUtils.toast('AI response inserted', 'success');
    } else {
      LWSUtils.toast('Click inside a text field, then try inserting again', 'default');
    }
  }

  return {
    init, checkSupport, generate,
    tasks, handleAction, insertOutput,
    onStateChange, getState, getModels, setModel,
    buildPanelHTML,
  };

})();
