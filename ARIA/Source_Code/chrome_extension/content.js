(() => {
  'use strict';

  const API = 'http://localhost:5000';
  const STORAGE_HISTORY_KEY = 'aria_conversation_history';
  const MAX_SESSIONS = 20;

  let chatHistory   = [];   // current session turns
  let isOpen        = false;
  let isThinking    = false;
  let currentDoc    = null;
  let panelSide     = 'right'; // 'right' or 'left'
  let activeTab     = 'chat';

  // ── Ball position state ───────────────────────────────────────────
  let ballY    = window.innerHeight / 2;
  let ballSide = 'right'; // which edge the ball is snapped to
  let dragging = false;
  let dragStartX, dragStartY, dragStartBallY;

  // ── Build DOM ─────────────────────────────────────────────────────

  // Hidden file input (outside shadow DOM)
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.pdf';
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  // Ball
  const ball = document.createElement('div');
  ball.id = 'aria-ball';
  ball.innerHTML = `
    <div class="aria-placeholder">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="#666" stroke-width="1.5"/>
        <path d="M9 12l2 2 4-4" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>`;
  document.body.appendChild(ball);

  // Panel
  const panel = document.createElement('div');
  panel.id = 'aria-panel';
  panel.classList.add('slide-right');
  panel.innerHTML = `
    <div id="aria-resize"></div>

    <div id="aria-header">
      <div class="aria-logo">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="1" stroke="#4a4030" stroke-width="1.5"/>
          <path d="M8 12h8M12 8v8" stroke="#c8b060" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <div>
          <div class="aria-logo-text">ARIA</div>
          <div class="aria-logo-sub">Adaptive Retrieval Intelligence Assistant</div>
        </div>
      </div>
      <div class="aria-header-right">
        <div class="aria-status">
          <div class="aria-dot" id="aria-dot"></div>
          <span id="aria-status-text">connecting…</span>
        </div>
        <button id="aria-close" title="Close">
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    </div>

    <div id="aria-tabs">
      <button class="aria-tab active" data-tab="chat">Chat</button>
      <button class="aria-tab" data-tab="history">History</button>
      <button class="aria-tab" data-tab="documents">Documents</button>
    </div>

    <!-- ── CHAT PANE ── -->
    <div class="aria-pane active" id="pane-chat">
      <div id="aria-doc-bar">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style="flex-shrink:0">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                stroke="#2e4a2e" stroke-width="1.8"/>
          <path d="M14 2v6h6" stroke="#2e4a2e" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        <span id="aria-doc-name" class="empty">no document loaded</span>
        <button id="aria-clear-doc" style="display:none">eject</button>
      </div>
      <div id="aria-messages">
        <div class="aria-divider">session start</div>
      </div>
      <div id="aria-input-area">
        <textarea id="aria-input" placeholder="Ask a question…" rows="3"></textarea>
        <div id="aria-toolbar">
          <div class="aria-left-tools">
            <button id="aria-upload-btn" title="Upload PDF">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 15V3m0 0l-4 4m4-4l4 4"
                      stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2"
                      stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
            </button>
            <button id="aria-clear-chat">clear chat</button>
          </div>
          <div class="aria-right-tools">
            <span id="aria-hint">↵ send</span>
            <button id="aria-send">Send</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── HISTORY PANE ── -->
    <div class="aria-pane" id="pane-history">
      <div id="aria-history-pane"></div>
      <div class="aria-history-actions">
        <button id="aria-clear-all-history">clear all history</button>
      </div>
    </div>

    <!-- ── DOCUMENTS PANE ── -->
    <div class="aria-pane" id="pane-documents">
      <div id="aria-docs-pane"></div>
      <div class="aria-docs-actions">
        <button id="aria-upload-new-btn">+ Upload New Document</button>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  // ── Refs ──────────────────────────────────────────────────────────
  const messagesEl     = panel.querySelector('#aria-messages');
  const inputEl        = panel.querySelector('#aria-input');
  const sendBtn        = panel.querySelector('#aria-send');
  const closeBtn       = panel.querySelector('#aria-close');
  const clearChatBtn   = panel.querySelector('#aria-clear-chat');
  const uploadBtn      = panel.querySelector('#aria-upload-btn');
  const docNameEl      = panel.querySelector('#aria-doc-name');
  const clearDocBtn    = panel.querySelector('#aria-clear-doc');
  const dot            = panel.querySelector('#aria-dot');
  const statusText     = panel.querySelector('#aria-status-text');
  const resizeHandle   = panel.querySelector('#aria-resize');
  const historyPane    = panel.querySelector('#aria-history-pane');
  const docsPane       = panel.querySelector('#aria-docs-pane');
  const clearAllHist   = panel.querySelector('#aria-clear-all-history');
  const uploadNewBtn   = panel.querySelector('#aria-upload-new-btn');
  const tabs           = panel.querySelectorAll('.aria-tab');

  // ── Health check ──────────────────────────────────────────────────
  async function checkHealth() {
    try {
      const r = await fetch(`${API}/health`, { signal: AbortSignal.timeout(3000) });
      if (r.ok) {
        const data = await r.json();
        dot.classList.remove('offline');
        statusText.textContent = 'online';
        if (data.document && !currentDoc) {
          currentDoc = data.document;
          updateDocBar(data.document, data.chunks_indexed);
        }
      } else throw new Error();
    } catch {
      dot.classList.add('offline');
      statusText.textContent = 'offline';
    }
  }
  checkHealth();
  setInterval(checkHealth, 10000);

  // ── Ball dragging ─────────────────────────────────────────────────
  function positionBall() {
    ball.style.top  = ballY + 'px';
    ball.style.transform = 'translateY(0)';
    if (ballSide === 'right') {
      ball.style.right = '14px';
      ball.style.left  = 'auto';
    } else {
      ball.style.left  = '14px';
      ball.style.right = 'auto';
    }
  }
  positionBall();

  ball.addEventListener('pointerdown', e => {
    dragging    = true;
    dragStartX  = e.clientX;
    dragStartY  = e.clientY;
    dragStartBallY = ballY;
    ball.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  ball.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dy = e.clientY - dragStartY;
    ballY = Math.max(28, Math.min(window.innerHeight - 28, dragStartBallY + dy));
    positionBall();
  });

  ball.addEventListener('pointerup', e => {
    if (!dragging) return;
    dragging = false;
    const dx = Math.abs(e.clientX - dragStartX);
    const dy = Math.abs(e.clientY - dragStartY);

    // Snap side based on pointer X position
    ballSide = e.clientX < window.innerWidth / 2 ? 'left' : 'right';
    positionBall();

    // If barely moved → treat as click
    if (dx < 6 && dy < 6) {
      togglePanel();
    }
  });

  // ── Panel open/close ──────────────────────────────────────────────
  function togglePanel() { isOpen ? closePanel() : openPanel(); }

  function openPanel() {
    isOpen    = true;
    panelSide = ballSide;

    // Remove old side classes, set new
    panel.classList.remove('slide-right','slide-left','open-right','open-left');
    if (panelSide === 'right') {
      panel.classList.add('open-right');
      ball.style.right = (panel.offsetWidth || 380) + 18 + 'px';
      ball.style.left  = 'auto';
    } else {
      panel.classList.add('open-left');
      ball.style.left  = (panel.offsetWidth || 380) + 18 + 'px';
      ball.style.right = 'auto';
    }
    setTimeout(() => inputEl.focus(), 310);
  }

  function closePanel() {
    isOpen = false;
    panel.classList.remove('open-right','open-left');
    panel.classList.add(panelSide === 'right' ? 'slide-right' : 'slide-left');
    // Return ball to edge
    ballSide = panelSide;
    positionBall();
  }

  closeBtn.addEventListener('click', closePanel);

  // ── Resize ────────────────────────────────────────────────────────
  let resizing = false, rsStartX = 0, rsStartW = 0;
  resizeHandle.addEventListener('mousedown', e => {
    resizing = true; rsStartX = e.clientX; rsStartW = panel.offsetWidth;
    document.body.style.userSelect = 'none'; e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!resizing) return;
    const delta = panelSide === 'right' ? rsStartX - e.clientX : e.clientX - rsStartX;
    const w = Math.min(640, Math.max(300, rsStartW + delta));
    panel.style.width = w + 'px';
    if (panelSide === 'right') ball.style.right = w + 18 + 'px';
    else                       ball.style.left  = w + 18 + 'px';
  });
  document.addEventListener('mouseup', () => {
    resizing = false; document.body.style.userSelect = '';
  });

  // ── Tab switching ─────────────────────────────────────────────────
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const t = tab.dataset.tab;
      activeTab = t;
      tabs.forEach(x => x.classList.toggle('active', x.dataset.tab === t));
      panel.querySelectorAll('.aria-pane').forEach(p => p.classList.remove('active'));
      panel.querySelector(`#pane-${t}`).classList.add('active');

      if (t === 'history')   renderHistory();
      if (t === 'documents') renderDocuments();
    });
  });

  // ── Message helpers ───────────────────────────────────────────────
  function addMessage(role, text, sources) {
    const el = document.createElement('div');
    el.className = `aria-msg ${role}`;
    el.textContent = text;
    if (sources > 0 && role === 'assistant') {
      const s = document.createElement('div');
      s.className = 'aria-sources';
      s.textContent = `↳ grounded on ${sources} document chunk${sources !== 1 ? 's' : ''}`;
      el.appendChild(s);
    }
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  function addThinking() {
    const el = document.createElement('div');
    el.className = 'aria-msg thinking';
    el.innerHTML = `<span class="aria-thinking-dots">generating<span>.</span><span>.</span><span>.</span></span>`;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
    return el;
  }

  // ── Send message ──────────────────────────────────────────────────
  async function send() {
    const text = inputEl.value.trim();
    if (!text || isThinking) return;

    addMessage('user', text, 0);
    inputEl.value = '';
    inputEl.style.height = 'auto';
    isThinking = true;
    sendBtn.disabled = true;
    const thinkEl = addThinking();

    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: chatHistory }),
      });
      const data = await res.json();
      thinkEl.remove();

      if (data.error) {
        addMessage('error', '⚠ ' + data.error, 0);
      } else {
        addMessage('assistant', data.response, data.sources_used || 0);
        chatHistory.push({ user: text, assistant: data.response });
      }
    } catch {
      thinkEl.remove();
      addMessage('error', '⚠ Cannot reach Flask server. Is it running on port 5000?', 0);
    } finally {
      isThinking = false;
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  sendBtn.addEventListener('click', send);
  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 150) + 'px';
  });

  // ── Doc bar helpers ───────────────────────────────────────────────
  function updateDocBar(name, chunks) {
    currentDoc = name;
    docNameEl.textContent = `${name}  (${chunks} chunks)`;
    docNameEl.classList.remove('empty');
    clearDocBtn.style.display = 'block';
    uploadBtn.classList.add('has-doc');
  }
  function resetDocBar() {
    currentDoc = null;
    docNameEl.textContent = 'no document loaded';
    docNameEl.classList.add('empty');
    clearDocBtn.style.display = 'none';
    uploadBtn.classList.remove('has-doc');
  }

  clearDocBtn.addEventListener('click', async () => {
    try {
      await fetch(`${API}/clear_document`, { method: 'POST' });
      resetDocBar();
      addMessage('assistant', 'Document ejected. Now in general mode.', 0);
    } catch {
      addMessage('error', '⚠ Could not clear document.', 0);
    }
  });

  // ── Upload logic ──────────────────────────────────────────────────
  async function uploadFile(file) {
    if (!file) return;

    setUploadSpinner(true);
    const notice = addMessage('assistant', `📄 Uploading and indexing "${file.name}"…`, 0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res  = await fetch(`${API}/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      notice.remove();

      if (data.error) {
        addMessage('error', '⚠ Upload failed: ' + data.error, 0);
      } else {
        addMessage('assistant',
          `✅ "${file.name}" saved & indexed. ${data.chunks} chunks ready.`, 0);
        updateDocBar(file.name, data.chunks);
        // Switch to chat tab
        tabs.forEach(x => x.classList.toggle('active', x.dataset.tab === 'chat'));
        panel.querySelectorAll('.aria-pane').forEach(p => p.classList.remove('active'));
        panel.querySelector('#pane-chat').classList.add('active');
        activeTab = 'chat';
      }
    } catch {
      notice.remove();
      addMessage('error', '⚠ Upload failed. Is Flask running?', 0);
    } finally {
      setUploadSpinner(false);
      fileInput.value = '';
    }
  }

  function setUploadSpinner(on) {
    uploadBtn.classList.toggle('uploading', on);
    uploadBtn.innerHTML = on
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
           <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83
                    M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"
                 stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
         </svg>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none">
           <path d="M12 15V3m0 0l-4 4m4-4l4 4"
                 stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
           <path d="M3 17v2a2 2 0 002 2h14a2 2 0 002-2v-2"
                 stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
         </svg>`;
  }

  uploadBtn.addEventListener('click', () => fileInput.click());
  uploadNewBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => {
    uploadFile(fileInput.files[0]);
    // Switch to chat to show progress
    if (activeTab !== 'chat') {
      tabs.forEach(x => x.classList.toggle('active', x.dataset.tab === 'chat'));
      panel.querySelectorAll('.aria-pane').forEach(p => p.classList.remove('active'));
      panel.querySelector('#pane-chat').classList.add('active');
      activeTab = 'chat';
    }
  });

  // ── Clear chat (saves session to history) ─────────────────────────
  clearChatBtn.addEventListener('click', () => {
    if (chatHistory.length > 0) saveSession();
    chatHistory = [];
    messagesEl.innerHTML = '<div class="aria-divider">session start</div>';
  });

  // ── History: chrome.storage.local ─────────────────────────────────
  function saveSession() {
    if (chatHistory.length === 0) return;
    chrome.storage.local.get([STORAGE_HISTORY_KEY], result => {
      const sessions = result[STORAGE_HISTORY_KEY] || [];
      sessions.unshift({
        date: new Date().toLocaleString(),
        turns: [...chatHistory],
        doc: currentDoc
      });
      if (sessions.length > MAX_SESSIONS) sessions.length = MAX_SESSIONS;
      chrome.storage.local.set({ [STORAGE_HISTORY_KEY]: sessions });
    });
  }

  // Auto-save when page unloads
  window.addEventListener('beforeunload', () => {
    if (chatHistory.length > 0) saveSession();
  });

  function renderHistory() {
    historyPane.innerHTML = '';
    chrome.storage.local.get([STORAGE_HISTORY_KEY], result => {
      const sessions = result[STORAGE_HISTORY_KEY] || [];
      if (sessions.length === 0) {
        historyPane.innerHTML =
          `<div class="aria-empty-state">No conversation history yet.</div>`;
        return;
      }
      sessions.forEach((session, si) => {
        const el = document.createElement('div');
        el.className = 'aria-history-session';
        el.innerHTML = `
          <div class="aria-history-session-header">
            <div>
              <div class="aria-session-date">${session.date}</div>
              ${session.doc
                ? `<div class="aria-session-count" style="color:#2a4a2a;font-style:italic;">
                     📄 ${session.doc}</div>`
                : ''}
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <span class="aria-session-count">${session.turns.length} turn${session.turns.length !== 1 ? 's' : ''}</span>
              <button class="aria-delete-session" data-si="${si}">delete</button>
            </div>
          </div>
          <div class="aria-history-msgs" id="hist-msgs-${si}">
            ${session.turns.map(t => `
              <div class="aria-history-turn">
                <div class="aria-history-turn-user">You: ${escHtml(t.user)}</div>
                <div class="aria-history-turn-assistant">${escHtml(t.assistant)}</div>
              </div>`).join('')}
          </div>`;

        // Toggle expand
        el.querySelector('.aria-history-session-header')
          .addEventListener('click', () => {
            el.querySelector(`#hist-msgs-${si}`).classList.toggle('expanded');
          });

        // Delete session
        el.querySelector('.aria-delete-session').addEventListener('click', e => {
          e.stopPropagation();
          chrome.storage.local.get([STORAGE_HISTORY_KEY], r => {
            const s = r[STORAGE_HISTORY_KEY] || [];
            s.splice(si, 1);
            chrome.storage.local.set({ [STORAGE_HISTORY_KEY]: s }, renderHistory);
          });
        });

        historyPane.appendChild(el);
      });
    });
  }

  clearAllHist.addEventListener('click', () => {
    chrome.storage.local.remove([STORAGE_HISTORY_KEY], renderHistory);
  });

  // ── Documents tab ─────────────────────────────────────────────────
  async function renderDocuments() {
    docsPane.innerHTML =
      `<div class="aria-empty-state" style="color:#333;">Loading…</div>`;
    try {
      const res  = await fetch(`${API}/documents`);
      const data = await res.json();
      docsPane.innerHTML = '';

      if (!data.documents || data.documents.length === 0) {
        docsPane.innerHTML =
          `<div class="aria-empty-state">No saved documents yet.<br>Upload one to get started.</div>`;
        return;
      }

      data.documents.forEach(filename => {
        const isActive = filename === currentDoc;
        const el = document.createElement('div');
        el.className = `aria-doc-item${isActive ? ' active-doc' : ''}`;
        el.innerHTML = `
          <div class="aria-doc-icon">
            <svg width="14" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                    stroke="${isActive ? '#4a7a5a' : '#333'}" stroke-width="1.8"/>
              <path d="M14 2v6h6" stroke="${isActive ? '#4a7a5a' : '#333'}"
                    stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="aria-doc-info">
            <div class="aria-doc-filename">${escHtml(filename)}</div>
            <div class="aria-doc-hint">${isActive ? 'currently loaded' : 'click to load'}</div>
          </div>
          <button class="aria-doc-delete" title="Delete">
            <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>`;

        // Load document
        el.addEventListener('click', async () => {
          if (isActive) return;
          docsPane.querySelectorAll('.aria-doc-item').forEach(x => x.style.opacity='0.4');
          try {
            const r = await fetch(`${API}/load_document`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filename })
            });
            const d = await r.json();
            if (d.error) {
              addMessage('error', '⚠ ' + d.error, 0);
            } else {
              updateDocBar(filename, d.chunks);
              addMessage('assistant',
                `✅ "${filename}" loaded — ${d.chunks} chunks indexed. Switch to Chat to ask questions.`, 0);
            }
          } catch {
            addMessage('error', '⚠ Could not load document.', 0);
          }
          renderDocuments();
        });

        // Delete document
        el.querySelector('.aria-doc-delete').addEventListener('click', async e => {
          e.stopPropagation();
          try {
            const r = await fetch(`${API}/delete_document`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filename })
            });
            const d = await r.json();
            if (d.error) { addMessage('error', '⚠ ' + d.error, 0); return; }
            if (filename === currentDoc) resetDocBar();
            renderDocuments();
          } catch {
            addMessage('error', '⚠ Could not delete document.', 0);
          }
        });

        docsPane.appendChild(el);
      });
    } catch {
      docsPane.innerHTML =
        `<div class="aria-empty-state">Could not reach Flask server.</div>`;
    }
  }

  // ── Utility ───────────────────────────────────────────────────────
  function escHtml(str) {
    return str
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

})();
