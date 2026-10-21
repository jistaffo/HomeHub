// ============================================================
// ENVIRONMENT
// ============================================================
const HH_ENV = 'production'; // 'staging' | 'production'

function renderEnvBadge() {
  const el = document.getElementById('env-badge');
  if (!el) return;
  if (HH_ENV === 'staging') {
    el.innerHTML = '<span style="font-family:var(--mono);font-size:10px;background:rgba(207,154,108,.18);color:var(--amber);padding:2px 8px;border-radius:20px;letter-spacing:.05em;vertical-align:middle;margin-left:8px">🧪 STAGING</span>';
  } else {
    el.innerHTML = '';
  }
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW register failed:', e));
}

// ============================================================
// sw() — panel switcher
// ============================================================
function sw(id, btn) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('on'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('on'));
  const panel = document.getElementById('panel-' + id);
  if (panel) panel.classList.add('on');
  if (btn) btn.classList.add('on');
}
function goToTab(id) {
  const btn = Array.from(document.querySelectorAll('.tab-btn'))
    .find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes(`sw('${id}'`));
  sw(id, btn);
}

// ============================================================
// Mobile nav drawer
// ============================================================
function toggleMobileNav() {
  const open = document.getElementById('nav-drawer').classList.contains('open');
  if (open) closeMobileNav(); else openMobileNav();
}
function openMobileNav() {
  document.getElementById('nav-drawer').classList.add('open');
  document.getElementById('nav-drawer-overlay').classList.add('open');
}
function closeMobileNav() {
  document.getElementById('nav-drawer').classList.remove('open');
  document.getElementById('nav-drawer-overlay').classList.remove('open');
}
function swMobile(id) {
  goToTab(id);
  document.querySelectorAll('.nav-drawer-btn').forEach(b => b.classList.remove('on'));
  const btn = Array.from(document.querySelectorAll('.nav-drawer-btn'))
    .find(b => b.getAttribute('onclick') === `swMobile('${id}')`);
  if (btn) btn.classList.add('on');
  closeMobileNav();
}

// ============================================================
// toggleAcc() — accordion
// ============================================================
function toggleAcc(head) {
  head.parentElement.classList.toggle('open');
}

// ============================================================
// showFP() — floor plan switcher
// ============================================================
function showFP(level) {
  const mw = document.getElementById('fp-main-wrap');
  const bw = document.getElementById('fp-bsmt-wrap');
  if (level === 'main') { if(mw) mw.style.display=''; if(bw) bw.style.display='none'; }
  else { if(mw) mw.style.display='none'; if(bw) bw.style.display=''; }
}

// ============================================================
// Lightbox
// ============================================================
function openHubLb(src, cap) {
  const lb = document.getElementById('hub-lb');
  const img = document.getElementById('hub-lb-img');
  const capEl = document.getElementById('hub-lb-cap');
  if (img) img.src = src;
  if (capEl) capEl.textContent = cap || '';
  if (lb) lb.classList.add('open');
}
function closeHubLb() {
  const lb = document.getElementById('hub-lb');
  if (lb) lb.classList.remove('open');
}

// ============================================================
// SYNC ENGINE — JSONP transport, token-gated, record-level merge
// ============================================================
const _cache         = {};
let   _gasUrl        = null;
let   _gasToken      = null;
let   _gasReady      = false;
let   _gasError      = null;
let   _gasSyncing    = false;
let   _pendingWrites = {};
const _dirtyKeys     = new Set();
const WRITE_DEBOUNCE_MS = 900;

function gasUrl() {
  if (_gasUrl) return _gasUrl;
  try { _gasUrl = localStorage.getItem('homehub:gasUrl') || null; } catch(e) {}
  return _gasUrl;
}
function setGasUrl(url) {
  _gasUrl = url;
  try { localStorage.setItem('homehub:gasUrl', url); } catch(e) {}
}
function gasToken() {
  if (_gasToken) return _gasToken;
  try { _gasToken = localStorage.getItem('homehub:gasToken') || null; } catch(e) {}
  return _gasToken;
}
function setGasToken(tok) {
  _gasToken = tok;
  try { localStorage.setItem('homehub:gasToken', tok); } catch(e) {}
}

function jsonp(params) {
  return new Promise((resolve, reject) => {
    const cbName = 'hh_cb_' + Date.now() + '_' + Math.floor(Math.random()*1e6);
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('JSONP timeout after 12s'));
    }, 12000);

    window[cbName] = (data) => {
      cleanup();
      if (data && data.ok === false) reject(new Error(data.error || 'GAS error'));
      else resolve(data);
    };

    function cleanup() {
      clearTimeout(timeout);
      delete window[cbName];
      const el = document.getElementById(cbName);
      if (el) el.remove();
    }

    const url = gasUrl();
    const qs  = Object.entries({ ...params, token: gasToken() || '', callback: cbName })
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const script = document.createElement('script');
    script.id  = cbName;
    script.src = `${url}?${qs}`;
    script.onerror = () => { cleanup(); reject(new Error('Script load failed — check GAS URL and deployment')); };
    document.head.appendChild(script);
  });
}

async function sget(key) {
  if (_cache[key] !== undefined) return _cache[key];
  const url = gasUrl();
  if (!url) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
    catch(e) { return null; }
  }
  try {
    const data = await jsonp({ action: 'get', key });
    const parsed = (data.value && data.value !== '') ? JSON.parse(data.value) : null;
    _cache[key] = parsed;
    _gasReady = true; _gasError = null;
    updateGasIndicator();
    return parsed;
  } catch(e) {
    _gasError = e.message; updateGasIndicator();
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }
    catch(e2) { return null; }
  }
}

async function sset(key, val) {
  _cache[key] = val;
  try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}

  _dirtyKeys.add(key);
  updateGasIndicator();

  if (_pendingWrites[key]) clearTimeout(_pendingWrites[key]);
  _pendingWrites[key] = setTimeout(async () => {
    delete _pendingWrites[key];
    const url = gasUrl();
    if (!url) { _dirtyKeys.delete(key); updateGasIndicator(); return; }
    try {
      await jsonp({ action: 'set', key, value: encodeURIComponent(JSON.stringify(val)) });
      _gasReady = true; _gasError = null;
    } catch(e) { _gasError = e.message; }
    _dirtyKeys.delete(key);
    updateGasIndicator();
  }, WRITE_DEBOUNCE_MS);
}

async function fullReload() {
  Object.keys(_cache).forEach(k => delete _cache[k]);
  try { await renderLog(); }          catch(e) { console.warn('renderLog', e); }
  try { await renderContractors(); }  catch(e) { console.warn('renderContractors', e); }
  try { await renderWarranties(); }   catch(e) { console.warn('renderWarranties', e); }
  try { await renderFilters(); }      catch(e) { console.warn('renderFilters', e); }
  try { await renderUtils(); }        catch(e) { console.warn('renderUtils', e); }
  try { await renderUtilChart(); }    catch(e) { console.warn('renderUtilChart', e); }
  try {
    await loadTaskCompletions();
    buildCal();
    buildDashUpcoming();
  } catch(e) { console.warn('calendar', e); }
  try { await ctRender(); }           catch(e) { console.warn('ctRender', e); }
  try { await renderTodo(); }         catch(e) { console.warn('renderTodo', e); }
  try { await renderFindings(); }     catch(e) { console.warn('renderFindings', e); }
  try { await buildDashMoveIn(); }    catch(e) { console.warn('buildDashMoveIn', e); }
  try { await loadSensitiveFields(); } catch(e) { console.warn('sensitiveFields', e); }
  try { await renderSensitiveEditor(); } catch(e) { console.warn('renderSensitiveEditor', e); }
}

function showSetupModal() {
  const existing = document.getElementById('gas-setup-modal');
  if (existing) existing.remove();
  const m = document.createElement('div');
  m.id = 'gas-setup-modal';
  m.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.88);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  m.innerHTML = `
    <div style="background:#2b2825;border:1px solid #524a40;border-radius:12px;padding:28px;max-width:560px;width:100%;max-height:90vh;overflow-y:auto">
      <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#93ab8a;letter-spacing:.08em;margin-bottom:6px">GOOGLE SHEETS SETUP</div>
      <div style="font-size:20px;font-weight:600;margin-bottom:10px">Connect Your Shared Sheet</div>
      <p style="font-size:13px;color:#a89e8f;line-height:1.7;margin-bottom:16px">All hub data syncs to a shared Google Sheet. Both you and your partner connect using the same Web App URL and access code. One-time setup per device.</p>
      <div style="background:#332f2a;border-radius:8px;padding:14px 16px;margin-bottom:16px;font-size:13px;line-height:1.9">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#cf9a6c;margin-bottom:8px">STEP-BY-STEP</div>
        <ol style="padding-left:18px;color:#a89e8f">
          <li>Open your Google Sheet &rarr; <strong style="color:#ece6db">Extensions &rarr; Apps Script</strong></li>
          <li>Delete all default code &rarr; paste entire contents of <strong style="color:#ece6db">gas/HomeHub_GAS.js</strong></li>
          <li><strong style="color:#ece6db">Project Settings &rarr; Script Properties &rarr; Add property</strong>: name <code style="color:#89a4b8">HH_TOKEN</code>, value = a long random password only you two know</li>
          <li>Save, then <strong style="color:#ece6db">Deploy &rarr; New deployment</strong></li>
          <li>Gear icon next to "Select type" &rarr; <strong style="color:#ece6db">Web App</strong></li>
          <li>Execute as: <strong style="color:#ece6db">Me</strong> &nbsp;|&nbsp; Who has access: <strong style="color:#ece6db">Anyone</strong></li>
          <li>Deploy &rarr; authorize &rarr; copy the <strong style="color:#93ab8a">Web App URL</strong></li>
          <li>Paste the URL and your HH_TOKEN value below &rarr; Connect</li>
        </ol>
        <div style="margin-top:10px;padding:8px 10px;background:#2b2825;border-radius:6px;font-size:12px;color:#6d6557">
          ⚠️ Make sure you copy the <strong style="color:#ece6db">/exec</strong> URL (not /dev). "Anyone" access just means anyone with the URL can reach it — the HH_TOKEN is what actually gates reading or writing your data.
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:8px">
        <input id="gas-url-input" type="url" placeholder="https://script.google.com/macros/s/.../exec"
          style="background:#332f2a;border:1px solid #524a40;color:#ece6db;border-radius:6px;padding:9px 12px;font-size:12px;font-family:monospace">
        <input id="gas-token-input" type="text" placeholder="Access code (the HH_TOKEN value)"
          style="background:#332f2a;border:1px solid #524a40;color:#ece6db;border-radius:6px;padding:9px 12px;font-size:12px;font-family:monospace">
        <button onclick="connectGAS()" id="gas-connect-btn"
          style="background:#93ab8a;color:#1d1b18;border:none;border-radius:6px;padding:9px 18px;cursor:pointer;font-family:monospace;font-size:12px;font-weight:700">
          Connect
        </button>
      </div>
      <div id="gas-connect-status" style="font-family:monospace;font-size:12px;min-height:20px;margin-bottom:14px"></div>
      <div style="padding-top:12px;border-top:1px solid #413c34;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <span style="font-size:12px;color:#6d6557">Your partner uses the same URL + access code on their device.</span>
        <button onclick="document.getElementById('gas-setup-modal').remove()"
          style="background:transparent;border:1px solid #524a40;color:#a89e8f;border-radius:6px;padding:6px 14px;cursor:pointer;font-size:12px">
          Skip for now
        </button>
      </div>
    </div>`;
  document.body.appendChild(m);
  const savedUrl = gasUrl();
  const savedTok = gasToken();
  if (savedUrl) document.getElementById('gas-url-input').value = savedUrl;
  if (savedTok) document.getElementById('gas-token-input').value = savedTok;
}

async function connectGAS() {
  const urlInput = document.getElementById('gas-url-input');
  const tokInput = document.getElementById('gas-token-input');
  const statusEl = document.getElementById('gas-connect-status');
  const btn      = document.getElementById('gas-connect-btn');
  const url = urlInput ? urlInput.value.trim() : '';
  const tok = tokInput ? tokInput.value.trim() : '';

  if (!url || !url.includes('script.google.com') || !url.endsWith('/exec')) {
    statusEl.style.color = '#c68787';
    statusEl.textContent = '✕ URL must end in /exec — make sure you copied the Web App URL, not the editor URL.';
    return;
  }
  if (!tok) {
    statusEl.style.color = '#c68787';
    statusEl.textContent = '✕ Access code is required — this is the HH_TOKEN value you set as a Script Property.';
    return;
  }

  statusEl.style.color = '#cf9a6c';
  statusEl.textContent = '⏳ Testing connection (this can take 5–10 seconds first time)…';
  if (btn) btn.disabled = true;

  const prevUrl = _gasUrl, prevTok = _gasToken;
  _gasUrl = url; _gasToken = tok;

  try {
    const data = await jsonp({ action: 'get', key: '__ping__' });
    if (!data || data.ok === false) throw new Error(data ? data.error : 'No response');

    setGasUrl(url);
    setGasToken(tok);
    _gasReady = true; _gasError = null;
    statusEl.style.color = '#8faa80';
    statusEl.textContent = '✓ Connected! Your data will now sync with Google Sheets.';
    updateGasIndicator();

    setTimeout(async () => {
      const modal = document.getElementById('gas-setup-modal');
      if (modal) modal.remove();
      await fullReload();
      startPolling();
    }, 1500);
  } catch(e) {
    _gasUrl = prevUrl; _gasToken = prevTok;
    statusEl.style.color = '#c68787';
    statusEl.textContent = `✕ ${e.message}. Check: (1) HH_TOKEN script property matches the access code, (2) script saved & redeployed as new version, (3) "Who has access" = Anyone, (4) URL ends in /exec not /dev.`;
    if (btn) btn.disabled = false;
  }
}

function updateGasIndicator() {
  const ind = document.getElementById('gas-indicator');
  if (!ind) return;
  if (!gasUrl()) {
    ind.innerHTML = '<span style="color:#cf9a6c;font-family:monospace;font-size:11px;cursor:pointer" onclick="showSetupModal()">● Not connected — click to set up</span>';
  } else if (_gasError) {
    ind.innerHTML = `<span style="color:#c68787;font-family:monospace;font-size:11px;cursor:pointer" onclick="showSetupModal()">● Sheets error — click to fix</span>`;
  } else if (_dirtyKeys.size > 0) {
    ind.innerHTML = '<span style="color:#cf9a6c;font-family:monospace;font-size:11px">● Saving…</span>';
  } else if (_gasSyncing) {
    ind.innerHTML = '<span style="color:#89a4b8;font-family:monospace;font-size:11px">● Syncing…</span>';
  } else if (_gasReady) {
    ind.innerHTML = '<span style="color:#8faa80;font-family:monospace;font-size:11px">● Synced</span>';
  } else {
    ind.innerHTML = '<span style="color:#cf9a6c;font-family:monospace;font-size:11px;cursor:pointer" onclick="showSetupModal()">● Not connected — click to set up</span>';
  }
}

// ============================================================
// WHO'S USING THIS DEVICE — lightweight attribution
// ============================================================
const HH_USERS = ['Ian', 'Andrea'];
function getWhoAmI() {
  try { return localStorage.getItem('homehub:whoami') || null; } catch(e) { return null; }
}
function setWhoAmI(name) {
  try { localStorage.setItem('homehub:whoami', name); } catch(e) {}
  renderWhoAmIBadge();
}
function withStamp(rec) {
  rec.updatedBy = getWhoAmI() || 'Someone';
  rec.updatedAt = new Date().toISOString();
  return rec;
}
function attrTag(rec) {
  if (!rec || !rec.updatedBy) return '';
  const when = rec.updatedAt ? relTime(rec.updatedAt) : '';
  return `<span style="font-family:var(--mono);font-size:10px;color:var(--light);white-space:nowrap">— ${rec.updatedBy}${when ? ', ' + when : ''}</span>`;
}
function relTime(iso) {
  const d = Date.parse(iso);
  if (isNaN(d)) return '';
  const days = Math.floor((Date.now() - d) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return days + 'd ago';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function renderWhoAmIBadge() {
  const el = document.getElementById('whoami-badge');
  if (!el) return;
  const who = getWhoAmI();
  el.innerHTML = who
    ? `<span style="font-family:var(--mono);font-size:11px;color:var(--mid);cursor:pointer" onclick="showWhoAmIModal()" title="Click to switch">👤 ${who}</span>`
    : `<span style="font-family:var(--mono);font-size:11px;color:var(--amber);cursor:pointer" onclick="showWhoAmIModal()">👤 Who's this?</span>`;
}
function showWhoAmIModal() {
  const existing = document.getElementById('whoami-modal');
  if (existing) existing.remove();
  const m = document.createElement('div');
  m.id = 'whoami-modal';
  m.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
  m.innerHTML = `
    <div style="background:#2b2825;border:1px solid #524a40;border-radius:12px;padding:28px;max-width:360px;width:100%;text-align:center">
      <div style="font-size:18px;font-weight:600;margin-bottom:6px">Who's using this device?</div>
      <p style="font-size:13px;color:#a89e8f;margin-bottom:18px">Used to tag what you add or edit — just this device, remembered from now on.</p>
      <div style="display:flex;gap:10px;justify-content:center">
        ${HH_USERS.map(u => `<button onclick="setWhoAmI('${u}');document.getElementById('whoami-modal').remove()" style="flex:1;background:#93ab8a;color:#1d1b18;border:none;border-radius:8px;padding:12px;cursor:pointer;font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:700">${u}</button>`).join('')}
      </div>
    </div>`;
  document.body.appendChild(m);
}

// ============================================================
// SENSITIVE FIELDS — policy #, loan #, credit scores etc.
// Never stored in this file's source; fetched from the sheet at
// runtime, masked by default, revealed on click.
// ============================================================
const SENS_FIELD_LABELS = {
  insPolicyNumber: 'State Farm policy number',
  mortgageeLoanNumber: 'Mortgagee loan number',
  financeAppId: 'GreenSky application ID',
  creditScores: 'Credit scores'
};
async function loadSensitiveFields() {
  const s = await sget('homehub:sensitive') || {};
  document.querySelectorAll('.sens').forEach(el => {
    const k = el.dataset.sensKey;
    el.dataset.sensVal = s[k] || '';
  });
}
function revealSens(el) {
  const val = el.dataset.sensVal;
  if (el.classList.contains('sens-open')) {
    el.textContent = '••••••••••';
    el.classList.remove('sens-open');
    return;
  }
  el.textContent = val ? val : '(not set — add it below)';
  el.classList.add('sens-open');
}
async function saveSensitiveFields() {
  const s = {};
  Object.keys(SENS_FIELD_LABELS).forEach(k => {
    const input = document.getElementById('sens-in-' + k);
    if (input) s[k] = input.value.trim();
  });
  await sset('homehub:sensitive', s);
  await loadSensitiveFields();
  const status = document.getElementById('sens-save-status');
  if (status) { status.textContent = '✓ Saved'; setTimeout(() => status.textContent = '', 2000); }
}
async function renderSensitiveEditor() {
  const el = document.getElementById('sens-editor');
  if (!el) return;
  const s = await sget('homehub:sensitive') || {};
  el.innerHTML = Object.entries(SENS_FIELD_LABELS).map(([k, label]) =>
    `<div><label>${label}</label><input type="text" id="sens-in-${k}" value="${(s[k]||'').replace(/"/g,'&quot;')}" placeholder="Not set"></div>`
  ).join('') + `<button class="btn btn-teal btn-sm" style="margin-top:8px" onclick="saveSensitiveFields()">Save Sensitive Info</button> <span id="sens-save-status" style="font-family:var(--mono);font-size:11px;color:var(--teal);margin-left:8px"></span>`;
}

// ============================================================
// MULTI-USER SYNC — 60s polling, idle-aware apply, per-record merge
// ============================================================
const SYNC_KEYS = [
  'homehub:logs', 'homehub:contractors', 'homehub:warranties', 'homehub:utils',
  'homehub:ct', 'homehub:findings', 'homehub:todos',
  'homehub:taskCompletions', 'homehub:filters', 'homehub:sensitive'
];
const RECORD_ARRAY_KEYS = { // key -> field used as the merge identity
  'homehub:logs': 'id', 'homehub:contractors': 'id', 'homehub:warranties': 'id',
  'homehub:utils': 'month', 'homehub:ct': 'id', 'homehub:findings': 'id', 'homehub:todos': 'id'
};
const POLL_INTERVAL_MS = 60000;
const IDLE_THRESHOLD_MS = 4000;
const APPLY_CAP_MS = 7 * 60 * 1000;

let _lastActivityAt = Date.now();
function markActive() { _lastActivityAt = Date.now(); }
document.addEventListener('input', markActive, true);
document.addEventListener('focusin', markActive, true);
document.addEventListener('mousedown', markActive, true);

function isFieldFocused() {
  const a = document.activeElement;
  return !!(a && ['INPUT', 'TEXTAREA', 'SELECT'].includes(a.tagName));
}
function isUserActive() {
  return isFieldFocused() || (Date.now() - _lastActivityAt < IDLE_THRESHOLD_MS);
}

function mergeArraysById(local, remote, idField) {
  local = local || []; remote = remote || [];
  const localMap = new Map(local.map(r => [r[idField], r]));
  const remoteMap = new Map(remote.map(r => [r[idField], r]));
  const ids = new Set([...localMap.keys(), ...remoteMap.keys()]);
  const merged = [];
  ids.forEach(id => {
    const l = localMap.get(id), r = remoteMap.get(id);
    if (l && r) {
      const lt = l.updatedAt ? Date.parse(l.updatedAt) : 0;
      const rt = r.updatedAt ? Date.parse(r.updatedAt) : 0;
      merged.push(rt >= lt ? r : l);
    } else {
      merged.push(r || l);
    }
  });
  return merged;
}

let _pendingSnapshot = null;
let _pendingSince = null;
let _pollTimer = null;

async function pollTick() {
  if (!gasUrl()) return;
  _gasSyncing = true; updateGasIndicator();
  try {
    const snap = {};
    for (const key of SYNC_KEYS) {
      const data = await jsonp({ action: 'get', key });
      snap[key] = (data.value && data.value !== '') ? JSON.parse(data.value) : null;
    }
    _gasReady = true; _gasError = null;
    _pendingSnapshot = snap;
    if (!_pendingSince) _pendingSince = Date.now();
    tryApplyPending();
  } catch(e) {
    _gasError = e.message;
  }
  _gasSyncing = false; updateGasIndicator();
}

function tryApplyPending() {
  if (!_pendingSnapshot) return;
  const overCap = _pendingSince && (Date.now() - _pendingSince > APPLY_CAP_MS);
  if (isUserActive() && !overCap) {
    setTimeout(tryApplyPending, 2000);
    return;
  }
  applySnapshot(_pendingSnapshot);
  _pendingSnapshot = null;
  _pendingSince = null;
}

async function applySnapshot(snap) {
  let touched = new Set();
  for (const key of SYNC_KEYS) {
    if (!(key in snap)) continue;
    if (_dirtyKeys.has(key) && !RECORD_ARRAY_KEYS[key]) continue;
    const remote = snap[key];
    if (RECORD_ARRAY_KEYS[key]) {
      const local = _cache[key] || [];
      const merged = mergeArraysById(local, remote || [], RECORD_ARRAY_KEYS[key]);
      _cache[key] = merged;
      try { localStorage.setItem(key, JSON.stringify(merged)); } catch(e) {}
    } else {
      _cache[key] = remote;
      try { localStorage.setItem(key, JSON.stringify(remote)); } catch(e) {}
    }
    touched.add(key);
  }
  if (touched.size) await fullReload();
}

function startPolling() {
  if (_pollTimer) return;
  if (!gasUrl()) return;
  _pollTimer = setInterval(pollTick, POLL_INTERVAL_MS);
  setTimeout(pollTick, 5000);
}

// ============================================================
// CALENDAR
// ============================================================
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const TASKS = [
  {id:'m-filter',f:'M',mo:'all',text:'Check/replace HVAC filter — Lennox furnace (16×25×1 or 20×25×1, MERV 8–11)',mundane:false,logCat:'HVAC',logTitle:'HVAC filter change'},
  {id:'m-smoke',f:'M',mo:'all',text:'Test smoke detectors and CO detectors — press test button',mundane:true},
  {id:'m-drains',f:'M',mo:'all',text:'Run all drains (basement, tubs, sinks) to prevent trap evaporation',mundane:true},
  {id:'m-wh-leak',f:'M',mo:'all',text:'Check water heater area for leaks or corrosion (until replaced)',mundane:true},
  {id:'m-utils',f:'M',mo:'all',text:'Log utility bills: LPC electric, Atmos/Xcel gas, water',mundane:true},
  {id:'m-sinks',f:'M',mo:'all',text:'Check under sinks for any slow drips or moisture',mundane:true},
  {id:'q-hood',f:'Q',mo:[1,4,7,10],text:'Clean range hood filters — kitchen exhaust fan',mundane:true},
  {id:'q-garage',f:'Q',mo:[1,4,7,10],text:'Lubricate garage door springs, hinges, and rollers',mundane:true},
  {id:'q-undersink',f:'Q',mo:[1,4,7,10],text:'Inspect under-sink plumbing for leaks',mundane:true},
  {id:'q-fridge',f:'Q',mo:[1,4,7,10],text:'Vacuum refrigerator coils — Winia WTE21HBSLD00',mundane:true},
  {id:'q-gfci',f:'Q',mo:[1,4,7,10],text:'Test all GFCI outlets (kitchen, bathrooms, garage)',mundane:true},
  {id:'s-spring-furnace',f:'S',mo:[2,3],text:'Spring: Schedule end-of-season furnace tune-up — Lennox 66,000 BTU (serial 1715A20979)',mundane:false,logCat:'HVAC',logTitle:'Furnace tune-up (spring/end-of-season)'},
  {id:'s-spring-roof',f:'S',mo:[2,3],text:'Spring: Inspect roof + gutters after winter — Class 4 impact shingles (2018)',mundane:true},
  {id:'s-spring-radon',f:'S',mo:[3,4],text:'Spring: Retest radon (every 2 years is the standard interval)',mundane:false,logCat:'Other',logTitle:'Radon retest'},
  {id:'s-summer-wh-flush',f:'S',mo:[6],text:'Summer: Flush water heater sediment (annual flush) or service new unit',mundane:false,logCat:'Plumbing',logTitle:'Water heater sediment flush'},
  {id:'s-fall-tuneup',f:'S',mo:[8,9],text:'Fall: Schedule pre-season furnace tune-up BEFORE heating season starts',mundane:false,logCat:'HVAC',logTitle:'Furnace tune-up (fall/pre-season)'},
  {id:'s-fall-hosebibs',f:'S',mo:[9,10],text:'Fall: Drain and winterize hose bibs BEFORE first frost',mundane:true},
  {id:'s-fall-gutters',f:'S',mo:[9,10],text:'Fall: Clean gutters after leaf drop',mundane:false,logCat:'Roof/Exterior',logTitle:'Gutter cleaning (fall)'},
  {id:'s-fall-recaulk',f:'S',mo:[9],text:'Fall: Recaulk windows before winter',mundane:false,logCat:'Windows/Doors',logTitle:'Window/door recaulking'},
  {id:'a-sewer',f:'A',mo:[0],text:'Annual: Scope sewer lateral — 57-yr clay pipe, cottonwood roots',mundane:false,logCat:'Plumbing',logTitle:'Sewer lateral camera scope'},
  {id:'a-panel',f:'A',mo:[8],text:'Annual: Check electrical panel — monitor dirt entry through conduit',mundane:true},
  {id:'a-chimney',f:'A',mo:[8],text:'Annual: Dryer vent + exhaust duct cleaning',mundane:false,logCat:'Appliance',logTitle:'Dryer vent cleaning'},
  {id:'a-treetrim',f:'A',mo:[10],text:'Annual: Trim cottonwood trees away from roofline and sewer lateral area',mundane:false,logCat:'Landscaping',logTitle:'Tree trimming (cottonwoods)'},
  {id:'a-insurance-review',f:'A',mo:[5],text:'Annual: Insurance policy review with Jordan Martin (303-834-8555)',mundane:false,logCat:'Other',logTitle:'Annual insurance policy review'},
  {id:'a-homestead',f:'A',mo:[0],text:'Annual: File Homestead Exemption with Boulder County Assessor by Jan 1',mundane:true},
  {id:'a-taxassess',f:'A',mo:[9],text:'Annual: Review property tax assessment — deadline to protest is May 1',mundane:true},
];

let taskCompletions = {};
async function loadTaskCompletions() {
  taskCompletions = await sget('homehub:taskCompletions') || {};
}
async function saveTaskCompletions() {
  await sset('homehub:taskCompletions', taskCompletions);
}
function cycleKey(task, mo, yr) {
  if (task.f === 'A') return `${yr}`;
  return `${yr}-${String(mo+1).padStart(2,'0')}`;
}
function isTaskDone(task, mo, yr) {
  const key = `${task.id}:${cycleKey(task, mo, yr)}`;
  return !!taskCompletions[key];
}
async function toggleTaskDone(taskId, mo, yr, taskText) {
  const task = TASKS.find(t => t.id === taskId);
  if (!task) return;
  const key = `${taskId}:${cycleKey(task, mo, yr)}`;
  if (taskCompletions[key]) {
    if (confirm(`Mark "${taskText}" as NOT done?\n\n(Completed on ${taskCompletions[key]})`)) {
      delete taskCompletions[key];
      await saveTaskCompletions();
      if (!task.mundane && task.logCat) await removeAutoLog(key);
      buildCal();
      buildDashUpcoming();
    }
  } else {
    const promptMsg = task.mundane
      ? `Mark this task as completed?\n\n"${taskText}"\n\nIt will reappear automatically when due again.`
      : `Mark this task as completed?\n\n"${taskText}"\n\nThis will be added to your Repair Log too.`;
    if (confirm(promptMsg)) {
      const today = new Date().toISOString().slice(0,10);
      taskCompletions[key] = today;
      await saveTaskCompletions();
      if (!task.mundane && task.logCat) await addAutoLog(key, task, today);
      buildCal();
      buildDashUpcoming();
    }
  }
}
async function addAutoLog(completionKey, task, dateStr) {
  const logs = await sget('homehub:logs') || [];
  logs.unshift(withStamp({
    id: Date.now(), date: dateStr, cat: task.logCat, title: task.logTitle || task.text,
    cost: 0, contractor: '', warranty: '', notes: 'Auto-logged from recurring maintenance schedule.',
    autoKey: completionKey
  }));
  await sset('homehub:logs', logs);
  await renderLog();
}
async function removeAutoLog(completionKey) {
  let logs = await sget('homehub:logs') || [];
  const before = logs.length;
  logs = logs.filter(l => l.autoKey !== completionKey);
  if (logs.length !== before) { await sset('homehub:logs', logs); await renderLog(); }
}

let calCurrentFilter = 'all';
function filterCal(f, btn) {
  calCurrentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => { if (b.parentElement === btn.parentElement) b.classList.remove('on'); });
  btn.classList.add('on');
  buildCal();
}
let calShowCompleted = false;
function toggleCalShowCompleted() { calShowCompleted = !calShowCompleted; buildCal(); }

function buildCal() {
  const grid = document.getElementById('cal-grid');
  if (!grid) return;
  const now = new Date();
  const startMo = now.getMonth();
  const startYr = now.getFullYear();
  let html = '';
  let hiddenCount = 0;
  for (let i = 0; i < 12; i++) {
    const mo = (startMo + i) % 12;
    const yr = startYr + Math.floor((startMo + i) / 12);
    let tasks = TASKS.filter(t => {
      if (calCurrentFilter !== 'all' && t.f !== calCurrentFilter) return false;
      if (t.mo === 'all') return true;
      if (Array.isArray(t.mo)) return t.mo.includes(mo);
      return t.mo === mo;
    });
    if (!calShowCompleted) {
      const before = tasks.length;
      tasks = tasks.filter(t => !isTaskDone(t, mo, yr));
      hiddenCount += before - tasks.length;
    }
    if (tasks.length === 0) continue;
    const fColors = {M:'var(--teal)',Q:'var(--navy)',S:'var(--amber)',A:'var(--purple)'};
    html += `<div class="cal-month"><div class="cal-month-head">${MONTHS[mo].toUpperCase()} ${yr}</div>`;
    tasks.forEach(t => {
      const done = isTaskDone(t, mo, yr);
      const escText = t.text.replace(/'/g,"\\'").replace(/"/g,'&quot;');
      html += `<div class="cal-task" style="cursor:pointer;${done?'opacity:.5':''}" onclick="toggleTaskDone('${t.id}',${mo},${yr},'${escText}')">
        <span style="font-family:var(--mono);font-size:10px;color:${fColors[t.f]||'var(--mid)'};width:16px;flex-shrink:0">${done?'✓':t.f}</span>
        <span class="cal-task-text" style="${done?'text-decoration:line-through':''}">${t.text}${done?` <span style="font-family:var(--mono);font-size:10px;color:var(--green)">— done ${taskCompletions[`${t.id}:${cycleKey(t,mo,yr)}`]}</span>`:''}</span>
      </div>`;
    });
    html += '</div>';
  }
  const toggleLabel = calShowCompleted
    ? `<button class="btn btn-ghost btn-sm" onclick="toggleCalShowCompleted()">Hide completed</button>`
    : `<button class="btn btn-ghost btn-sm" onclick="toggleCalShowCompleted()">Show completed${hiddenCount ? ` (${hiddenCount})` : ''}</button>`;
  const toggleEl = document.getElementById('cal-show-completed-toggle');
  if (toggleEl) toggleEl.innerHTML = toggleLabel;
  grid.innerHTML = html || '<p style="color:var(--mid)">✓ All caught up — nothing left for the next 12 months on this filter.</p>';
}

function buildDashUpcoming() {
  const el = document.getElementById('dash-upcoming');
  if (!el) return;
  const now = new Date();
  const startMo = now.getMonth();
  const startYr = now.getFullYear();
  let collected = [];
  for (let i = 0; i < 12 && collected.length < 8; i++) {
    const mo = (startMo + i) % 12;
    const yr = startYr + Math.floor((startMo + i) / 12);
    const monthTasks = TASKS.filter(t => {
      if (t.mo === 'all') return i === 0;
      if (Array.isArray(t.mo)) return t.mo.includes(mo);
      return t.mo === mo;
    }).filter(t => !isTaskDone(t, mo, yr));
    monthTasks.forEach(t => collected.push({ t, mo, yr }));
  }
  collected = collected.slice(0, 8);
  el.innerHTML = collected.map(({t, mo, yr}) => {
    const escText = t.text.replace(/'/g,"\\'").replace(/"/g,'&quot;');
    return `<div class="upcoming-item" style="cursor:pointer" onclick="toggleTaskDone('${t.id}',${mo},${yr},'${escText}')">
      <span class="upcoming-mo">${t.f}</span>
      <span class="upcoming-text">${t.text}</span>
    </div>`;
  }).join('') || '<p style="color:var(--mid);font-size:13px">✓ All caught up for the next 12 months.</p>';
}

async function buildDashMoveIn() {
  const el = document.getElementById('dash-movein-progress');
  if (!el) return;
  const todos = await sget('homehub:todos') || [];
  const moveInTasks = todos.filter(t => t.cat === 'movein');
  const doneCount = moveInTasks.filter(t => t.done).length;
  const total = moveInTasks.length;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;
  el.innerHTML = total
    ? `<div class="prog-bg"><div class="prog-fill" style="width:${pct}%"></div></div><p style="font-family:var(--mono);font-size:11px;color:var(--mid);margin-top:4px">${doneCount} of ${total} move-in tasks complete (${pct}%)</p>`
    : `<p style="color:var(--mid);font-size:13px">No move-in tasks logged yet — add some in To-Do Projects tagged "🏠 Move-In".</p>`;
}

// ============================================================
// UTILITY SPEND CHART (Dashboard) — single-series bar chart, one
// axis, teal fill matching the app's existing accent, hover
// tooltip, direct label on the latest bar only.
// ============================================================
async function renderUtilChart() {
  const el = document.getElementById('util-chart-card');
  if (!el) return;
  const utils = (await sget('homehub:utils') || []).slice().sort((a,b) => a.month.localeCompare(b.month));
  if (!utils.length) {
    el.innerHTML = `<p style="color:var(--mid);font-size:13px;padding:4px 0">No utility payments logged yet — add one in the Utilities tab and it'll show up here.</p>`;
    return;
  }
  const recent = utils.slice(-12);
  const totals = recent.map(u => (u.elec||0) + (u.gas||0) + (u.water||0));
  const maxVal = Math.max(...totals, 1);
  const latest = recent[recent.length - 1];
  const latestTotal = totals[totals.length - 1];
  const yearTotal = utils.filter(u => u.month.startsWith(String(new Date().getFullYear()))).reduce((s,u) => s + (u.elec||0)+(u.gas||0)+(u.water||0), 0);

  const w = 600, h = 170, padL = 34, padB = 22, padT = 20, padR = 8;
  const chartW = w - padL - padR, chartH = h - padT - padB;
  const barGap = 6;
  const barW = Math.max(10, (chartW / recent.length) - barGap);
  const gridLines = 3;

  let gridSvg = '';
  for (let i = 0; i <= gridLines; i++) {
    const y = padT + (chartH / gridLines) * i;
    gridSvg += `<line class="uchart-gridline" x1="${padL}" y1="${y}" x2="${w-padR}" y2="${y}"/>`;
  }

  let barsSvg = '';
  recent.forEach((u, i) => {
    const val = totals[i];
    const barH = maxVal ? (val / maxVal) * chartH : 0;
    const x = padL + i * (barW + barGap);
    const y = padT + chartH - barH;
    const moLabel = u.month.slice(5,7) + '/' + u.month.slice(2,4);
    const isLast = i === recent.length - 1;
    barsSvg += `<rect class="uchart-bar" x="${x}" y="${y}" width="${barW}" height="${Math.max(barH,2)}" rx="4"
      data-month="${u.month}" data-amount="${val.toFixed(2)}" data-kwh="${u.kwh||''}"
      onmousemove="uchartTooltip(event,'${u.month}',${val.toFixed(2)},${u.kwh||0})"
      onmouseleave="uchartTooltipHide()"></rect>`;
    if (isLast) {
      barsSvg += `<text class="uchart-bar-label" x="${x + barW/2}" y="${y - 6}" text-anchor="middle">$${val.toFixed(0)}</text>`;
    }
    barsSvg += `<text class="uchart-axis-label" x="${x + barW/2}" y="${h - 6}" text-anchor="middle">${moLabel}</text>`;
  });

  el.innerHTML = `
    <div class="uchart-hero">
      <div><div class="uchart-hero-num">$${latestTotal.toFixed(2)}</div><div class="uchart-hero-lbl">Last payment logged (${latest.month})</div></div>
      <div><div class="uchart-hero-num" style="font-size:20px;color:var(--teal)">$${yearTotal.toFixed(2)}</div><div class="uchart-hero-lbl">Total this year</div></div>
    </div>
    <div class="uchart-svg-wrap">
      <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto" role="img" aria-label="Monthly utility spend, ${recent.length} months">
        ${gridSvg}${barsSvg}
      </svg>
      <div class="uchart-tooltip" id="uchart-tooltip"></div>
    </div>
    <p class="disc" style="margin-top:6px">Electric + water are billed together by City of Longmont on one statement — shown here as a combined total. Hover a bar for exact amounts; kWh shows when logged.</p>`;
}
function uchartTooltip(evt, month, amount, kwh) {
  const tip = document.getElementById('uchart-tooltip');
  if (!tip) return;
  const wrap = tip.parentElement.getBoundingClientRect();
  const x = evt.clientX - wrap.left;
  const y = evt.clientY - wrap.top;
  tip.style.left = x + 'px';
  tip.style.top = y + 'px';
  tip.textContent = kwh ? `${month} · $${amount.toFixed(2)} · ${kwh} kWh` : `${month} · $${amount.toFixed(2)}`;
  tip.classList.add('show');
}
function uchartTooltipHide() {
  const tip = document.getElementById('uchart-tooltip');
  if (tip) tip.classList.remove('show');
}

// ============================================================
// SYSTEM LIFECYCLES
// ============================================================
const LIFECYCLE_SYSTEMS = [
  { name: 'Water Heater', detail: 'GE gas 40-gal, serial GELN0810411030 · Mfd Aug 2010', installYear: 2010, expectedLifeYrs: 12 },
  { name: 'Furnace', detail: 'Lennox 66,000 BTU, serial 1715A20979', installYear: 2017, expectedLifeYrs: 20 },
  { name: 'Roof', detail: 'Composition shingle, Class 4 impact-resistant', installYear: 2018, expectedLifeYrs: 30 },
  { name: 'Electrical Panel', detail: 'Square D 100A — scheduled for 200A upgrade', installYear: 1969, expectedLifeYrs: 40 },
];
function buildLifecycles() {
  const el = document.getElementById('lc-systems');
  if (!el) return;
  const now = new Date().getFullYear();
  el.innerHTML = LIFECYCLE_SYSTEMS.map(s => {
    const age = now - s.installYear;
    const pct = Math.min(100, Math.round((age / s.expectedLifeYrs) * 100));
    const cls = pct >= 100 ? 'danger' : pct >= 75 ? 'warn' : 'good';
    return `<div class="lc-card">
      <div class="lc-top"><span class="lc-name">${s.name}</span><span class="tag ${cls==='danger'?'tag-red':cls==='warn'?'tag-amber':'tag-green'}">${age} yrs old</span></div>
      <div class="lc-detail">${s.detail}</div>
      <div class="lc-bar-bg"><div class="lc-bar ${cls}" style="width:${pct}%"></div></div>
      <div class="lc-nums"><span>Installed ${s.installYear}</span><span>Expected life ~${s.expectedLifeYrs} yrs</span></div>
    </div>`;
  }).join('');
}

// ============================================================
// AIR FILTER TRACKER
// ============================================================
async function saveFilter() {
  const date = document.getElementById('filter-date').value;
  if (!date) { alert('Date is required.'); return; }
  const filters = await sget('homehub:filters') || [];
  filters.unshift(withStamp({
    id: Date.now(), date,
    size: document.getElementById('filter-size').value.trim(),
    type: document.getElementById('filter-type').value.trim(),
    notes: document.getElementById('filter-notes').value.trim()
  }));
  await sset('homehub:filters', filters);
  ['filter-size','filter-type','filter-notes'].forEach(id => { const el = document.getElementById(id); if (el) el.value=''; });
  await renderFilters();
}
async function renderFilters() {
  const filters = await sget('homehub:filters') || [];
  const el = document.getElementById('filter-list');
  if (!el) return;
  if (!filters.length) { el.innerHTML = '<p style="color:var(--mid);font-size:13px;padding:8px 0">No filter changes logged yet.</p>'; return; }
  el.innerHTML = filters.map(f => `<div class="card2" style="margin-bottom:6px">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <span style="font-weight:600">${f.date}${f.size?` · ${f.size}`:''}${f.type?` · ${f.type}`:''}</span>
      ${attrTag(f)}
    </div>
    ${f.notes?`<div style="font-size:12px;color:var(--mid);margin-top:4px">${f.notes}</div>`:''}
  </div>`).join('');
}

// ============================================================
// REPAIR LOG
// ============================================================
async function addLog() {
  const title = document.getElementById('log-title').value.trim();
  if (!title) { alert('Title/description is required.'); return; }
  const logs = await sget('homehub:logs') || [];
  logs.unshift(withStamp({
    id: Date.now(),
    date: document.getElementById('log-date-in').value,
    cat: document.getElementById('log-cat').value,
    title,
    cost: parseFloat(document.getElementById('log-cost').value) || 0,
    contractor: document.getElementById('log-contractor').value.trim(),
    warranty: document.getElementById('log-warranty').value.trim(),
    notes: document.getElementById('log-notes').value.trim()
  }));
  await sset('homehub:logs', logs);
  document.getElementById('log-title').value = '';
  document.getElementById('log-cost').value = '';
  document.getElementById('log-contractor').value = '';
  document.getElementById('log-warranty').value = '';
  document.getElementById('log-notes').value = '';
  await renderLog();
}
async function deleteLog(id) {
  if (!confirm('Delete this entry?')) return;
  let logs = await sget('homehub:logs') || [];
  logs = logs.filter(l => l.id !== id);
  await sset('homehub:logs', logs);
  await renderLog();
}
const CAT_COLORS = {Plumbing:'tag-navy',Electrical:'tag-amber',HVAC:'tag-teal','Roof/Exterior':'tag-green',Appliance:'tag-purple','Windows/Doors':'tag-red',Flooring:'tag-gray',Painting:'tag-gray',Landscaping:'tag-green',Other:'tag-gray'};
async function renderLog() {
  const logs = await sget('homehub:logs') || [];
  const el = document.getElementById('log-list');
  const tot = document.getElementById('log-total');
  if (!el) return;
  const total = logs.reduce((s,l) => s + (l.cost||0), 0);
  if (tot) tot.textContent = `Total spend: $${total.toFixed(2)}`;
  if (!logs.length) { el.innerHTML = '<p style="color:var(--mid);font-size:13px;padding:12px 0">No entries yet.</p>'; return; }
  el.innerHTML = logs.map(l => `
    <div class="log-entry">
      <div class="log-header">
        <div>
          <div class="log-meta"><span class="tag ${CAT_COLORS[l.cat]||'tag-gray'}">${l.cat}</span><span class="log-date">${l.date}</span>${l.autoKey?'<span class="tag tag-teal">🔄 Auto</span>':''}${l.contractor?`<span style="font-size:12px;color:var(--mid)">· ${l.contractor}</span>`:''}</div>
          <div class="log-title">${l.title}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
          <span class="log-cost">${l.cost?'$'+l.cost.toFixed(2):'—'}</span>
          <button class="btn btn-red btn-sm" onclick="deleteLog(${l.id})">✕</button>
        </div>
      </div>
      ${l.warranty?`<div style="font-size:12px;color:var(--teal);font-family:var(--mono)">Warranty: ${l.warranty}</div>`:''}
      ${l.notes?`<div class="log-body">${l.notes}</div>`:''}
      ${attrTag(l)}
    </div>`).join('');
}

// ============================================================
// CONTRACTORS
// ============================================================
const SEED_CONTRACTORS = [
  {id:1,name:'Sheena Rosenquist',trade:'Real Estate Agent',phone:'303-507-5223',web:'',lic:'',rating:5,notes:'Buyer\'s agent · St. Vrain Realty LLC'},
  {id:2,name:'Steven Stom CPI CCPI',trade:'Home Inspector',phone:'720-442-0785',web:'',lic:'CPI CCPI',rating:5,notes:'Total Home Inspection Services LLC · Steve@ChooseTHI.com · 78-page report May 26, 2026'},
  {id:3,name:'Little Home Builder',trade:'ADU/tiny home builder',phone:'',web:'https://littlehomebuilder.com',lic:'',rating:0,notes:'Autumn plan · 576 sqft · 1 bed/1 bath'},
  {id:4,name:'Longmont Building Dept',trade:'City/Permits',phone:'303-651-8332',web:'',lic:'',rating:0,notes:'Building permits for all work requiring permits'},
  {id:5,name:'Longmont Power & Communications (LPC)',trade:'Utility',phone:'303-651-8386',web:'',lic:'',rating:0,notes:'Electric + water utility for Longmont · combined AutoPay billing, account #2300001'},
  {id:6,name:'Efficiency Works Colorado',trade:'HVAC',phone:'877-981-1888',web:'https://efficiencyworks.org',lic:'',rating:0,notes:'Energy rebates — HVAC, insulation, weatherization'},
  {id:7,name:'Longmont Planning',trade:'City/Permits',phone:'303-651-8330',web:'',lic:'',rating:0,notes:'ADU permits and zoning questions · HB24-1152'},
  {id:8,name:'Jordan Martin',trade:'Insurance Agent',phone:'303-834-8555',web:'',lic:'',rating:0,notes:'State Farm agent · 721 5th Ave, Longmont CO 80501 · Alt phone 303-834-9576 · Policy # on file — see Insurance tab'},
  {id:9,name:'CMG Mortgage Inc. (Mortgagee)',trade:'Other',phone:'',web:'',lic:'',rating:0,notes:'ISAOA/ATIMA · PO Box 2803, Daytona Beach FL 32120-2803 · Loan # on file — see Insurance tab'},
  {id:10,name:'BlueBird',trade:'Windows/Doors',phone:'',web:'',lic:'',rating:4,notes:'Windows + entry doors project · see Projects tab for financing detail'},
  {id:11,name:'GreenSky / Synovus Bank (Pinnacle Bank TN)',trade:'Other',phone:'',web:'',lic:'',rating:0,notes:'Financing for BlueBird project · App ID on file — see Projects tab · $13,340 financed at 20.99% APR'},
];
let contractorFilter = 'all';
async function seedContractorsIfEmpty() {
  const existing = await sget('homehub:contractors');
  if (existing === null || existing === undefined) {
    await sset('homehub:contractors', SEED_CONTRACTORS);
  }
}
async function addContractor() {
  const name = document.getElementById('c-name').value.trim();
  if (!name) { alert('Name is required.'); return; }
  const contractors = await sget('homehub:contractors') || [];
  contractors.push(withStamp({
    id: Date.now(), name,
    trade: document.getElementById('c-trade').value,
    phone: document.getElementById('c-phone').value.trim(),
    web: document.getElementById('c-web').value.trim(),
    lic: document.getElementById('c-lic').value.trim(),
    rating: parseInt(document.getElementById('c-rating').value) || 0,
    notes: document.getElementById('c-notes').value.trim()
  }));
  await sset('homehub:contractors', contractors);
  document.getElementById('c-name').value = '';
  document.getElementById('c-phone').value = '';
  document.getElementById('c-web').value = '';
  document.getElementById('c-lic').value = '';
  document.getElementById('c-rating').value = '';
  document.getElementById('c-notes').value = '';
  await renderContractors(contractorFilter);
}
async function deleteContractor(id) {
  if (!confirm('Delete this contractor?')) return;
  let list = await sget('homehub:contractors') || [];
  list = list.filter(c => c.id !== id);
  await sset('homehub:contractors', list);
  await renderContractors(contractorFilter);
}
async function renderContractors(filter, btn) {
  if (filter !== undefined) contractorFilter = filter;
  if (btn) { document.querySelectorAll('#ct-filter-bar .filter-btn').forEach(b => b.classList.remove('on')); btn.classList.add('on'); }
  let list = await sget('homehub:contractors') || [];
  const filtered = contractorFilter === 'all' ? list : list.filter(c => c.trade === contractorFilter);
  const el = document.getElementById('contractors-list');
  if (!el) return;
  if (!filtered.length) { el.innerHTML = '<p style="color:var(--mid);font-size:13px;padding:12px 0">No contractors in this category.</p>'; return; }
  el.innerHTML = filtered.map(c => `
    <div class="card" style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-weight:600;font-size:14px;margin-bottom:4px">${c.name}</div>
          <span class="tag tag-navy">${c.trade}</span>
          ${c.rating?`<span style="font-family:var(--mono);font-size:11px;color:var(--amber);margin-left:8px">${'★'.repeat(c.rating)}${'☆'.repeat(5-c.rating)}</span>`:''}
        </div>
        <button class="btn btn-red btn-sm" onclick="deleteContractor(${c.id})">✕</button>
      </div>
      <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:8px;font-size:13px">
        ${c.phone?`<a href="tel:${c.phone}" style="color:var(--teal)">📞 ${c.phone}</a>`:''}
        ${c.web?`<a href="${c.web}" target="_blank" style="color:var(--navy)">🌐 Website</a>`:''}
        ${c.lic?`<span style="color:var(--mid)">Lic: ${c.lic}</span>`:''}
      </div>
      ${c.notes?`<div style="font-size:12px;color:var(--mid);margin-top:6px">${c.notes}</div>`:''}
      ${attrTag(c)}
    </div>`).join('');
}

// ============================================================
// WARRANTIES
// ============================================================
async function addWarranty() {
  const name = document.getElementById('w-name').value.trim();
  if (!name) { alert('Item name is required.'); return; }
  const warranties = await sget('homehub:warranties') || [];
  warranties.push(withStamp({
    id: Date.now(), name,
    model: document.getElementById('w-model').value.trim(),
    serial: document.getElementById('w-serial').value.trim(),
    expiry: document.getElementById('w-expiry').value,
    installer: document.getElementById('w-installer').value.trim(),
    phone: document.getElementById('w-phone').value.trim(),
    notes: document.getElementById('w-notes').value.trim()
  }));
  await sset('homehub:warranties', warranties);
  ['w-name','w-model','w-serial','w-expiry','w-installer','w-phone','w-notes'].forEach(id => {
    const el = document.getElementById(id); if(el) el.value = '';
  });
  await renderWarranties();
}
async function deleteWarranty(id) {
  if (!confirm('Delete warranty?')) return;
  let list = await sget('homehub:warranties') || [];
  list = list.filter(w => w.id !== id);
  await sset('homehub:warranties', list);
  await renderWarranties();
}
async function renderWarranties() {
  const list = await sget('homehub:warranties') || [];
  const el = document.getElementById('warranty-list');
  if (!el) return;
  if (!list.length) { el.innerHTML = '<p style="color:var(--mid);font-size:13px;padding:12px 0">No warranties logged yet.</p>'; return; }
  const today = new Date().toISOString().slice(0,10);
  el.innerHTML = list.map(w => {
    const expired = w.expiry && w.expiry < today;
    return `<div class="card" style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-weight:600;font-size:14px;margin-bottom:4px">${w.name}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${w.model?`<span class="tag tag-gray">Model: ${w.model}</span>`:''}
            ${w.serial?`<span class="tag tag-gray">S/N: ${w.serial}</span>`:''}
            ${w.expiry?`<span class="tag ${expired?'tag-red':'tag-teal'}">${expired?'EXPIRED':'Active'} · ${w.expiry}</span>`:''}
          </div>
        </div>
        <button class="btn btn-red btn-sm" onclick="deleteWarranty(${w.id})">✕</button>
      </div>
      <div style="margin-top:8px;font-size:12px;color:var(--mid)">
        ${w.installer?`<div>Installer: ${w.installer}</div>`:''}
        ${w.phone?`<div>Support: <a href="tel:${w.phone}" style="color:var(--teal)">${w.phone}</a></div>`:''}
        ${w.notes?`<div style="margin-top:4px">${w.notes}</div>`:''}
      </div>
      <div style="margin-top:4px">${attrTag(w)}</div>
    </div>`;
  }).join('');
}

// ============================================================
// UTILITIES
// ============================================================
async function addUtil() {
  const mo = document.getElementById('u-month').value;
  if (!mo) { alert('Month is required.'); return; }
  let utils = await sget('homehub:utils') || [];
  const idx = utils.findIndex(u => u.month === mo);
  const entry = withStamp({
    month: mo,
    kwh: parseFloat(document.getElementById('u-kwh').value) || 0,
    elec: parseFloat(document.getElementById('u-elec').value) || 0,
    gas: parseFloat(document.getElementById('u-gas').value) || 0,
    water: parseFloat(document.getElementById('u-water').value) || 0,
    notes: document.getElementById('u-notes').value.trim()
  });
  if (idx >= 0) utils[idx] = entry; else utils.unshift(entry);
  utils.sort((a,b) => b.month.localeCompare(a.month));
  await sset('homehub:utils', utils);
  ['u-month','u-kwh','u-elec','u-gas','u-water','u-notes'].forEach(id => {
    const el = document.getElementById(id); if(el) el.value = '';
  });
  await renderUtils();
  await renderUtilChart();
}
async function renderUtils() {
  const utils = await sget('homehub:utils') || [];
  const el = document.getElementById('utils-list');
  if (!el) return;
  if (!utils.length) { el.innerHTML = '<p style="color:var(--mid);font-size:13px;padding:12px 0">No utility data yet. Log your first month above.</p>'; return; }
  el.innerHTML = `<table class="dt" style="margin-top:8px">
    <thead><tr><th>Month</th><th>kWh</th><th>Electric</th><th>Gas</th><th>Water</th><th>Total</th><th>Notes</th><th></th></tr></thead>
    <tbody>${utils.map(u => {
      const total = (u.elec||0)+(u.gas||0)+(u.water||0);
      return `<tr><td><strong>${u.month}</strong></td><td>${u.kwh||'—'}</td><td>${u.elec?'$'+u.elec.toFixed(2):'—'}</td><td>${u.gas?'$'+u.gas.toFixed(2):'—'}</td><td>${u.water?'$'+u.water.toFixed(2):'—'}</td><td style="color:var(--teal);font-weight:600">$${total.toFixed(2)}</td><td style="color:var(--mid);font-size:12px">${u.notes||''}</td><td>${attrTag(u)}</td></tr>`;
    }).join('')}</tbody>
  </table>`;
}

// One-time seed of the 3 City of Longmont payment confirmations found via
// email (Jul/Sep/Oct 2026). Bundled electric+water per their combined
// billing — logged under "elec" with that noted so figures aren't
// misread as pure electric usage. Safe to re-run: skipped once any utils
// data already exists.
async function seedUtilityPaymentsIfEmpty() {
  const existing = await sget('homehub:utils');
  if (existing && existing.length) return;
  const seedStamp = { updatedBy: 'Auto-imported', updatedAt: new Date().toISOString() };
  const seeds = [
    { month: '2026-07', kwh: 0, elec: 73.61, gas: 0, water: 0, notes: 'City of Longmont combined electric+water (AutoPay), due Aug 13 — paid early Jul 27', ...seedStamp },
    { month: '2026-09', kwh: 0, elec: 196.02, gas: 0, water: 0, notes: 'City of Longmont combined electric+water (AutoPay)', ...seedStamp },
    { month: '2026-10', kwh: 0, elec: 262.03, gas: 0, water: 0, notes: 'City of Longmont combined electric+water (AutoPay)', ...seedStamp },
  ];
  await sset('homehub:utils', seeds);
}

// ============================================================
// CLOSING TRACKER
// ============================================================
let ctCurrentType = 'inspection';
let ctCurrentFilter = 'all';
function ctSelectType(type, btn) {
  ctCurrentType = type;
  document.querySelectorAll('.ct-type-tab').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  ['inspection','negotiation','deadline','cost','task'].forEach(t => {
    const f = document.getElementById('ct-form-' + t);
    if (f) f.style.display = t === type ? '' : 'none';
  });
}
async function ctAdd() {
  const t = ctCurrentType;
  let entry = withStamp({ id: Date.now(), type: t });
  if (t === 'inspection') {
    const title = document.getElementById('ct-insp-title').value.trim();
    if (!title) { alert('Title required.'); return; }
    entry = { ...entry, title, location: document.getElementById('ct-insp-loc').value.trim(),
      severity: document.getElementById('ct-insp-sev').value, cost: document.getElementById('ct-insp-cost').value.trim(),
      notes: document.getElementById('ct-insp-notes').value.trim() };
    ['ct-insp-title','ct-insp-loc','ct-insp-cost','ct-insp-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  } else if (t === 'negotiation') {
    const title = document.getElementById('ct-neg-title').value.trim();
    if (!title) { alert('Item required.'); return; }
    entry = { ...entry, title, negType: document.getElementById('ct-neg-type').value,
      amount: parseFloat(document.getElementById('ct-neg-amount').value)||0,
      status: document.getElementById('ct-neg-status').value, notes: document.getElementById('ct-neg-notes').value.trim() };
    ['ct-neg-title','ct-neg-amount','ct-neg-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  } else if (t === 'deadline') {
    const title = document.getElementById('ct-dl-title').value.trim();
    if (!title) { alert('Title required.'); return; }
    entry = { ...entry, title, date: document.getElementById('ct-date').value,
      dlType: document.getElementById('ct-dl-type').value, notes: document.getElementById('ct-dl-notes').value.trim() };
    ['ct-dl-title','ct-dl-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  } else if (t === 'cost') {
    const title = document.getElementById('ct-cost-title').value.trim();
    if (!title) { alert('Description required.'); return; }
    entry = { ...entry, title, costType: document.getElementById('ct-cost-type').value,
      amount: parseFloat(document.getElementById('ct-cost-amount').value)||0,
      direction: document.getElementById('ct-cost-dir').value, notes: document.getElementById('ct-cost-notes').value.trim() };
    ['ct-cost-title','ct-cost-amount','ct-cost-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  } else if (t === 'task') {
    const title = document.getElementById('ct-task-title').value.trim();
    if (!title) { alert('Task required.'); return; }
    entry = { ...entry, title, due: document.getElementById('ct-task-due').value,
      who: document.getElementById('ct-task-who').value, done: false, notes: document.getElementById('ct-task-notes').value.trim() };
    ['ct-task-title','ct-task-due','ct-task-notes'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  }
  const items = await sget('homehub:ct') || [];
  items.push(entry);
  await sset('homehub:ct', items);
  await ctRender();
}
async function ctDelete(id) {
  if (!confirm('Delete this entry?')) return;
  let items = await sget('homehub:ct') || [];
  items = items.filter(i => i.id !== id);
  await sset('homehub:ct', items);
  await ctRender();
}
async function ctToggleTask(id) {
  let items = await sget('homehub:ct') || [];
  const idx = items.findIndex(i => i.id === id);
  if (idx >= 0) items[idx].done = !items[idx].done;
  await sset('homehub:ct', items);
  await ctRender();
}
async function ctUpdateNegStatus(id, status) {
  let items = await sget('homehub:ct') || [];
  const idx = items.findIndex(i => i.id === id);
  if (idx >= 0) items[idx].status = status;
  await sset('homehub:ct', items);
  await ctRender();
}
async function ctRender(filter, btn) {
  if (filter !== undefined) ctCurrentFilter = filter;
  if (btn) { document.querySelectorAll('#panel-closing .filter-bar .filter-btn').forEach(b => b.classList.remove('on')); btn.classList.add('on'); }
  const items = await sget('homehub:ct') || [];
  ['inspection','negotiation','deadline','task'].forEach(t => {
    const el = document.getElementById('ct-count-'+t);
    if (el) el.textContent = items.filter(i => i.type === t).length;
  });
  let credits = 0, costs = 0;
  items.filter(i => i.type === 'cost').forEach(i => {
    if (i.direction === 'Credit to you') credits += i.amount||0;
    else costs += i.amount||0;
  });
  items.filter(i => i.type === 'negotiation' && i.status === 'Agreed').forEach(i => credits += i.amount||0);
  const netEl = document.getElementById('ct-fin-net');
  const net = credits - costs;
  if (document.getElementById('ct-fin-credits')) document.getElementById('ct-fin-credits').textContent = '$'+credits.toFixed(2);
  if (document.getElementById('ct-fin-costs')) document.getElementById('ct-fin-costs').textContent = '$'+costs.toFixed(2);
  if (netEl) { netEl.textContent = (net>=0?'+':'') + '$'+Math.abs(net).toFixed(2); netEl.className = 'fin-num '+(net>=0?'green':'red'); }
  const upEl = document.getElementById('ct-upcoming');
  if (upEl) {
    const today = new Date(); today.setHours(0,0,0,0);
    const deadlines = items.filter(i => (i.type==='deadline'||i.type==='task') && (i.date||i.due) && !i.done)
      .map(i => ({...i, d: new Date(i.date||i.due)}))
      .filter(i => i.d >= today)
      .sort((a,b) => a.d-b.d).slice(0,6);
    upEl.innerHTML = deadlines.map(i => {
      const days = Math.ceil((i.d-today)/86400000);
      const cls = days<3?'countdown-red':days<7?'countdown-amber':'countdown-teal';
      return `<div class="ct-entry">
        <div class="ct-entry-body">
          <div class="ct-entry-title">${i.title}</div>
          <div class="ct-entry-detail">${i.date||i.due}${i.dlType?' · '+i.dlType:''}${i.who?' · '+i.who:''}</div>
        </div>
        <span class="countdown ${cls}">${days===0?'TODAY':days+'d'}</span>
      </div>`;
    }).join('') || '<p style="color:var(--mid);font-size:13px">No upcoming deadlines.</p>';
  }
  const el = document.getElementById('ct-list');
  if (!el) return;
  const filtered = ctCurrentFilter === 'all' ? items : items.filter(i => i.type === ctCurrentFilter);
  const typeIcons = {inspection:'🔴',negotiation:'🤝',deadline:'📅',cost:'💵',task:'✅'};
  const sevColors = {major:'tag-red',significant:'tag-amber',moderate:'tag-amber',minor:'tag-green'};
  const statColors = {Agreed:'tag-green',Rejected:'tag-red',Countered:'tag-amber',Pending:'tag-gray'};
  el.innerHTML = filtered.slice().reverse().map(i => {
    let detail = '';
    if (i.type==='inspection') detail = `${i.severity?'<span class="tag '+sevColors[i.severity]+'">'+i.severity+'</span> ':''} ${i.location||''} ${i.cost?'· Est: '+i.cost:''}`;
    if (i.type==='negotiation') detail = `<span class="tag ${statColors[i.status]||'tag-gray'}">${i.status}</span> ${i.negType} ${i.amount?'· $'+i.amount.toFixed(2):''}`;
    if (i.type==='deadline') detail = `${i.date||''} · ${i.dlType||''}`;
    if (i.type==='cost') detail = `${i.direction} · ${i.costType} ${i.amount?'· $'+i.amount.toFixed(2):''}`;
    if (i.type==='task') detail = `Due: ${i.due||'—'} · ${i.who||''} ${i.done?'<span class="tag tag-green">Done</span>':''}`;
    return `<div class="ct-entry" style="${i.done?'opacity:.5':''}">
      <span style="font-size:18px;flex-shrink:0">${typeIcons[i.type]||'•'}</span>
      <div class="ct-entry-body">
        <div class="ct-entry-title" style="${i.done?'text-decoration:line-through':''}">${i.title}</div>
        <div class="ct-entry-detail">${detail}</div>
        ${i.notes?`<div class="ct-entry-notes">${i.notes}</div>`:''}
        ${attrTag(i)}
        ${i.type==='negotiation'?`<div style="display:flex;gap:6px;margin-top:6px">
          <button class="btn btn-ghost btn-sm" onclick="ctUpdateNegStatus(${i.id},'Agreed')">✓ Agreed</button>
          <button class="btn btn-ghost btn-sm" onclick="ctUpdateNegStatus(${i.id},'Countered')">↕ Countered</button>
          <button class="btn btn-ghost btn-sm" onclick="ctUpdateNegStatus(${i.id},'Rejected')">✕ Rejected</button>
        </div>`:''}
        ${i.type==='task'?`<button class="btn btn-ghost btn-sm" style="margin-top:6px" onclick="ctToggleTask(${i.id})">${i.done?'↩ Undo':'✓ Mark Done'}</button>`:''}
      </div>
      <button class="btn btn-red btn-sm" onclick="ctDelete(${i.id})">✕</button>
    </div>`;
  }).join('') || '<p style="color:var(--mid);font-size:13px;padding:12px 0">No entries yet.</p>';
}

// ============================================================
// INSPECTION FINDINGS (Projects tab) — rebuilt as plain editable
// records; the original 41-item reference list wasn't recoverable.
// ============================================================
let findingFilter = 'all';
function findingSetFilter(f, btn) {
  findingFilter = f;
  document.querySelectorAll('#finding-filter-bar .filter-btn').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  renderFindings();
}
async function addFinding() {
  const title = document.getElementById('find-title').value.trim();
  if (!title) { alert('Title is required.'); return; }
  const findings = await sget('homehub:findings') || [];
  findings.push(withStamp({
    id: Date.now(), title,
    location: document.getElementById('find-loc').value.trim(),
    severity: document.getElementById('find-sev').value,
    cost: document.getElementById('find-cost').value.trim(),
    notes: document.getElementById('find-notes').value.trim(),
    done: false
  }));
  await sset('homehub:findings', findings);
  ['find-title','find-loc','find-cost','find-notes'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  await renderFindings();
}
async function deleteFinding(id) {
  if (!confirm('Delete this finding?')) return;
  let findings = await sget('homehub:findings') || [];
  findings = findings.filter(f => f.id !== id);
  await sset('homehub:findings', findings);
  await renderFindings();
}
async function toggleFindingDone(id) {
  let findings = await sget('homehub:findings') || [];
  const idx = findings.findIndex(f => f.id === id);
  if (idx >= 0) { findings[idx].done = !findings[idx].done; withStamp(findings[idx]); }
  await sset('homehub:findings', findings);
  await renderFindings();
}
async function renderFindings() {
  const findings = await sget('homehub:findings') || [];
  const el = document.getElementById('findings-list');
  if (!el) return;
  const sevColors = {major:'🔴',significant:'🟠',moderate:'🟡',minor:'🟢'};
  const filtered = findings.filter(f => findingFilter==='all' ? true : findingFilter==='open' ? !f.done : f.done);
  if (!filtered.length) { el.innerHTML = '<p style="color:var(--mid);font-size:13px;padding:12px 0">No findings logged yet. Add one above.</p>'; return; }
  el.innerHTML = filtered.map(f => `
    <div class="proj-card ${f.done?'finding-done':''}">
      <div class="proj-card-head">
        <span style="font-size:20px">${sevColors[f.severity]||'•'}</span>
        <div style="flex:1"><div class="proj-card-title">${f.title}</div>${f.location?`<div style="font-size:12px;color:var(--mid)">${f.location}</div>`:''}</div>
        <button class="btn btn-ghost btn-sm" onclick="toggleFindingDone(${f.id})">${f.done?'↩ Reopen':'✓ Done'}</button>
        <button class="btn btn-red btn-sm" onclick="deleteFinding(${f.id})">✕</button>
      </div>
      ${f.cost?`<div style="font-size:13px;color:var(--teal);margin-top:4px">Est: ${f.cost}</div>`:''}
      ${f.notes?`<p style="font-size:13px;color:var(--mid);margin-top:6px">${f.notes}</p>`:''}
      ${attrTag(f)}
    </div>`).join('');
}

// ============================================================
// TO-DO PROJECTS — rebuilt as plain editable records; the
// original 46-item reference list wasn't recoverable.
// ============================================================
let todoFilterVal = 'all';
function todoFilter(f, btn) {
  todoFilterVal = f;
  document.querySelectorAll('#panel-todo .filter-bar .filter-btn').forEach(b => b.classList.remove('on'));
  if (btn) btn.classList.add('on');
  renderTodo();
}
async function addTodo() {
  const title = document.getElementById('todo-title').value.trim();
  if (!title) { alert('Title is required.'); return; }
  const todos = await sget('homehub:todos') || [];
  todos.push(withStamp({
    id: Date.now(), title,
    cat: document.getElementById('todo-cat').value,
    diff: document.getElementById('todo-diff').value,
    cost: document.getElementById('todo-cost').value.trim(),
    steps: document.getElementById('todo-steps').value.trim(),
    done: false
  }));
  await sset('homehub:todos', todos);
  ['todo-title','todo-cost','todo-steps'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  await renderTodo();
  await buildDashMoveIn();
}
async function deleteTodo(id) {
  if (!confirm('Delete this project?')) return;
  let todos = await sget('homehub:todos') || [];
  todos = todos.filter(t => t.id !== id);
  await sset('homehub:todos', todos);
  await renderTodo();
  await buildDashMoveIn();
}
async function toggleTodoDone(id) {
  let todos = await sget('homehub:todos') || [];
  const idx = todos.findIndex(t => t.id === id);
  if (idx >= 0) { todos[idx].done = !todos[idx].done; withStamp(todos[idx]); }
  await sset('homehub:todos', todos);
  await renderTodo();
  await buildDashMoveIn();
}
const DIFF_LABELS = {diy:['DIY','diff-diy'],easy:['Easy Hire','diff-easy'],medium:['Medium','diff-medium'],hard:['Complex','diff-hard'],pro:['Pro Only','diff-pro']};
async function renderTodo() {
  const todos = await sget('homehub:todos') || [];
  const total = todos.length;
  const done = todos.filter(t => t.done).length;
  const pct = total ? Math.round((done/total)*100) : 0;
  const totalEl = document.getElementById('todo-total'); if (totalEl) totalEl.textContent = total;
  const doneEl = document.getElementById('todo-done'); if (doneEl) doneEl.textContent = done;
  const pctEl = document.getElementById('todo-pct'); if (pctEl) pctEl.textContent = pct+'%';
  const progEl = document.getElementById('todo-prog'); if (progEl) progEl.style.width = pct+'%';
  const costSummary = todos.map(t => t.cost).filter(Boolean).join(', ');
  const costEl = document.getElementById('todo-cost-summary'); if (costEl) costEl.textContent = costSummary ? '—' : '—';

  const el = document.getElementById('todo-list');
  if (!el) return;
  let filtered = todos;
  if (todoFilterVal === 'movein') filtered = todos.filter(t => t.cat === 'movein');
  else if (todoFilterVal === 'windows') filtered = todos.filter(t => t.cat === 'windows');
  else if (['diy','easy','medium','hard','pro'].includes(todoFilterVal)) filtered = todos.filter(t => t.diff === todoFilterVal);
  else if (todoFilterVal === 'remaining') filtered = todos.filter(t => !t.done);

  if (!filtered.length) { el.innerHTML = '<p style="color:var(--mid);font-size:13px;padding:12px 0">No projects yet. Add one above.</p>'; return; }
  el.innerHTML = filtered.map(t => {
    const [lbl, cls] = DIFF_LABELS[t.diff] || ['', ''];
    return `<div class="todo-card ${t.done?'done':''}">
      <div class="todo-card-head" onclick="this.parentElement.classList.toggle('open')">
        <span class="todo-card-title">${t.title}</span>
        <span class="tag ${cls}">${lbl}</span>
        ${t.cat==='movein'?'<span class="tag tag-teal">🏠 Move-In</span>':''}
        ${t.cat==='windows'?'<span class="tag tag-purple">🪟 Windows</span>':''}
      </div>
      <div class="todo-card-body">
        ${t.cost?`<div style="font-size:13px;color:var(--teal);margin-bottom:6px">Est: ${t.cost}</div>`:''}
        ${t.steps?`<p style="font-size:13px;color:var(--mid);margin-bottom:10px">${t.steps}</p>`:''}
        ${attrTag(t)}
        <div style="display:flex;gap:6px;margin-top:10px">
          <button class="btn btn-teal btn-sm" onclick="event.stopPropagation();toggleTodoDone(${t.id})">${t.done?'↩ Reopen':'✓ Mark Done'}</button>
          <button class="btn btn-red btn-sm" onclick="event.stopPropagation();deleteTodo(${t.id})">✕ Delete</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ============================================================
// INIT
// ============================================================
async function init() {
  renderEnvBadge();
  try {
    const url = gasUrl();
    if (url) {
      try {
        const data = await jsonp({ action: 'get', key: '__ping__' });
        if (data && data.ok !== false) { _gasReady = true; }
      } catch(e) { _gasError = 'Connection failed'; }
    }
    updateGasIndicator();
  } catch(e) { console.warn('GAS init:', e); }

  try { await seedContractorsIfEmpty(); } catch(e) { console.warn('seedContractors:', e); }
  try { await seedUtilityPaymentsIfEmpty(); } catch(e) { console.warn('seedUtilityPayments:', e); }
  try { await loadTaskCompletions(); } catch(e) { console.warn('loadTaskCompletions:', e); }
  try { buildCal(); } catch(e) { console.warn('buildCal:', e); }
  try { buildDashUpcoming(); } catch(e) { console.warn('buildDashUpcoming:', e); }
  try { buildLifecycles(); } catch(e) { console.warn('buildLifecycles:', e); }

  const today = new Date().toISOString().slice(0,10);
  const logDate = document.getElementById('log-date-in');
  const ctDate = document.getElementById('ct-date');
  if (logDate) logDate.value = today;
  if (ctDate) ctDate.value = today;

  try { await renderContractors(); } catch(e) { console.warn('renderContractors:', e); }
  try { await renderWarranties(); } catch(e) { console.warn('renderWarranties:', e); }
  try { await renderFilters(); } catch(e) { console.warn('renderFilters:', e); }
  try { await renderUtils(); } catch(e) { console.warn('renderUtils:', e); }
  try { await renderUtilChart(); } catch(e) { console.warn('renderUtilChart:', e); }
  try { await renderLog(); } catch(e) { console.warn('renderLog:', e); }
  try { await ctRender(); } catch(e) { console.warn('ctRender:', e); }
  try { await renderTodo(); } catch(e) { console.warn('renderTodo:', e); }
  try { await renderFindings(); } catch(e) { console.warn('renderFindings:', e); }
  try { await buildDashMoveIn(); } catch(e) { console.warn('buildDashMoveIn:', e); }
  try { await loadSensitiveFields(); } catch(e) { console.warn('loadSensitiveFields:', e); }
  try { await renderSensitiveEditor(); } catch(e) { console.warn('renderSensitiveEditor:', e); }

  renderWhoAmIBadge();
  if (!getWhoAmI()) setTimeout(showWhoAmIModal, 600);

  if (gasUrl()) startPolling();

  try { registerServiceWorker(); } catch(e) { console.warn('sw register:', e); }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
