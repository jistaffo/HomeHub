// Top 10 — single-page client. No build step, no framework.

const $app = document.getElementById('app');
const $topbar = document.getElementById('topbar');
const $sheet = document.getElementById('sheet');
const $toast = document.getElementById('toast');

const state = { config: null, me: null, cats: {} };

// ---------- utilities ----------

const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: { 'content-type': 'application/json', 'x-top10': '1' },
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && !path.startsWith('/api/login') && !path.startsWith('/api/signup')) {
    state.me = null;
    location.hash = '#/';
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

let toastTimer;
function toast(msg, { error = false } = {}) {
  $toast.textContent = msg;
  $toast.classList.toggle('error', error);
  $toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($toast.hidden = true), error ? 4000 : 2200);
}

function avatar(user, size = '') {
  if (!user) return '';
  return `<span class="avatar ${size}" style="background:${esc(user.color)}" title="${esc(user.displayName)}">${esc(user.displayName[0])}</span>`;
}

function timeAgo(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}

const parseYear = (y) => Number(String(y || '').match(/\d{4}/)?.[0]) || null;
function fits(cat, year) {
  const y = parseYear(year);
  if (y == null) return cat.min == null && cat.max == null;
  return (cat.min == null || y >= cat.min) && (cat.max == null || y <= cat.max);
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Link copied');
  } catch {
    toast('Copy failed — select the link and copy it manually', { error: true });
  }
}

async function shareOrCopy(title, url) {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }
  copy(url);
}

const posterImg = (url, cls = '') =>
  url ? `<img class="${cls}" src="${esc(url)}" alt="" loading="lazy">` : `<div class="${cls} ph">🎬</div>`;

const loading = () => ($app.innerHTML = '<div class="spinner" aria-label="Loading"></div>');

// ---------- scores ----------

function scoreChips(scores = {}) {
  const chip = (cls, label, value, title) =>
    value
      ? `<span class="score" title="${esc(title)}"><span class="src ${cls}">${label}</span>${esc(value)}</span>`
      : `<span class="score na" title="${esc(title)}: not available"><span class="src">${label}</span>—</span>`;

  const imdb = scores.imdb ? scores.imdb.replace('/10', '') : null;
  const rt = scores.rottenTomatoes;
  const rtCls = rt && parseInt(rt, 10) >= 60 ? 'rt-fresh' : 'rt-rotten';
  const mc = scores.metacritic ? scores.metacritic.replace('/100', '') : null;
  const mcN = parseInt(mc, 10);
  const mcCls = mcN >= 61 ? 'mc-good' : mcN >= 40 ? 'mc-mixed' : 'mc-bad';

  return `<div class="scores">
    ${chip('imdb', 'IMDb', imdb, `IMDb user rating${scores.imdbVotes ? ` (${scores.imdbVotes} votes)` : ''}`)}
    ${chip(rtCls, 'RT', rt, 'Rotten Tomatoes Tomatometer')}
    ${chip(mcCls, 'MC', mc, 'Metacritic Metascore')}
  </div>`;
}

// ---------- movie tile ----------

function tileHTML(item, i, { editable = false, total = 0 } = {}) {
  const m = item.movie || {};
  const people = (arr) => (arr && arr.length ? esc(arr.join(', ')) : '<span class="muted">—</span>');
  const synopsisNote =
    { claude: 'Spoiler-free summary written from the plot synopsis.', 'imdb-short': 'IMDb plot summary.', tmdb: 'TMDB overview.' }[m.synopsisSource] || '';

  return `<li class="tile" data-i="${i}" data-id="${esc(m.imdbID)}">
    <div class="tile-main" role="button" tabindex="0" aria-expanded="false">
      <div class="rank">${i + 1}</div>
      ${posterImg(m.poster, 'poster')}
      <div class="tile-info">
        <h3 class="tile-title">${esc(m.title)} <span class="year">${esc(m.year || '')}</span></h3>
        <div class="credits">
          <div><b>Director</b> ${people(m.director)}</div>
          <div><b>Writer</b> ${people(m.writer)}</div>
          <div><b>Starring</b> ${people(m.actors)}</div>
        </div>
        ${scoreChips(m.scores)}
      </div>
      <div class="tile-actions">
        ${
          editable
            ? `<button class="icon-btn handle" draggable="true" title="Drag to reorder" aria-label="Drag to reorder">⠿</button>
               <button class="icon-btn" data-act="up" ${i === 0 ? 'disabled' : ''} aria-label="Move up">▲</button>
               <button class="icon-btn" data-act="down" ${i === total - 1 ? 'disabled' : ''} aria-label="Move down">▼</button>`
            : ''
        }
        <span class="icon-btn chev" aria-hidden="true">⌄</span>
      </div>
    </div>
    <div class="tile-more">
      ${m.synopsis ? `<p class="synopsis">${esc(m.synopsis)}</p><div class="synopsis-src">${synopsisNote}</div>` : m.director ? '<p class="synopsis muted">No description available.</p>' : '<p class="synopsis muted">Loading details…</p>'}
      <div class="facts">
        ${m.genre?.length ? `<span>${esc(m.genre.join(' · '))}</span>` : ''}
        ${m.runtime ? `<span>${esc(m.runtime)}</span>` : ''}
        ${m.rated ? `<span>Rated ${esc(m.rated)}</span>` : ''}
      </div>
      ${
        editable
          ? `<textarea class="note-edit" maxlength="280" placeholder="Why it made your list (optional)">${esc(item.note)}</textarea>`
          : item.note
            ? `<p class="note-view">${esc(item.note)}</p>`
            : ''
      }
      <div class="tile-links">
        <a class="btn" href="https://www.imdb.com/title/${esc(m.imdbID)}/" target="_blank" rel="noopener">IMDb ↗</a>
        ${editable ? '<button class="btn danger" data-act="remove">Remove</button>' : ''}
      </div>
    </div>
  </li>`;
}

function bindTileToggles(root) {
  root.querySelectorAll('.tile-main').forEach((el) => {
    const toggle = (e) => {
      if (e.target.closest('button, a, textarea')) return;
      const tile = el.closest('.tile');
      const open = tile.classList.toggle('open');
      el.setAttribute('aria-expanded', open);
    };
    el.addEventListener('click', toggle);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle(e);
      }
    });
  });
}

// Lists render from the server's movie cache; anything not cached yet gets
// fetched here and the tile is re-rendered in place.
function hydrate(items, rerender) {
  const missing = items.filter((it) => !it.movie?.director && it.movie?.imdbID);
  missing.forEach((it) =>
    api('GET', `/api/movies/${it.movie.imdbID}`)
      .then((m) => {
        it.movie = m;
        rerender();
      })
      .catch(() => {}),
  );
}

// ---------- movie search box ----------

// Type-ahead movie search. `reasonFor(result)` returns why a result can't be
// picked ('' if it can); `onPick(result)` does the work and may throw.
function moviePicker($input, $results, { reasonFor = () => '', onPick, busyText = (r) => `Loading ${r.title}…` }) {
  const placeholder = $input.placeholder;
  let timer;
  let results = [];
  let active = -1;
  let seq = 0;

  const close = () => {
    $results.hidden = true;
    active = -1;
  };
  const selectable = (i) => results[i] && !reasonFor(results[i]);
  const paint = () => {
    $results.innerHTML = results.length
      ? results
          .map((r, i) => {
            const reason = reasonFor(r);
            return `<li class="result ${reason ? 'disabled' : ''} ${i === active ? 'active' : ''}" data-i="${i}">
              ${r.poster ? `<img src="${esc(r.poster)}" alt="">` : '<div class="ph"></div>'}
              <div><div class="r-title">${esc(r.title)}</div><div class="r-sub">${esc(r.year)}${reason ? ` · ${esc(reason)}` : ''}</div></div>
            </li>`;
          })
          .join('')
      : '<li class="result disabled"><span class="muted">No movies found</span></li>';
    $results.hidden = false;
  };

  async function pick(i) {
    if (!selectable(i)) return;
    const r = results[i];
    close();
    $input.value = '';
    $input.disabled = true;
    $input.placeholder = busyText(r);
    try {
      await onPick(r);
    } catch (err) {
      toast(err.message, { error: true });
    } finally {
      if ($input.isConnected) {
        $input.disabled = false;
        $input.placeholder = placeholder;
        $input.focus();
      }
    }
  }

  $input.addEventListener('input', () => {
    clearTimeout(timer);
    const q = $input.value.trim();
    if (q.length < 2) return close();
    timer = setTimeout(async () => {
      const mine = ++seq;
      try {
        const data = await api('GET', `/api/movies/search?q=${encodeURIComponent(q)}`);
        if (mine !== seq) return;
        results = data.results;
        active = results.findIndex((_, i) => selectable(i));
        paint();
      } catch (err) {
        toast(err.message, { error: true });
      }
    }, 250);
  });
  $input.addEventListener('keydown', (e) => {
    if ($results.hidden) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      for (let n = 0, i = active; n < results.length; n++) {
        i = (i + dir + results.length) % results.length;
        if (selectable(i)) {
          active = i;
          break;
        }
      }
      paint();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(active);
    } else if (e.key === 'Escape') {
      e.stopPropagation(); // don't also close an enclosing dialog
      close();
    }
  });
  $results.addEventListener('mousedown', (e) => {
    const li = e.target.closest('.result');
    if (li) {
      e.preventDefault();
      pick(Number(li.dataset.i));
    }
  });
  $input.addEventListener('blur', () => setTimeout(close, 150));
}

// ---------- auth ----------

function renderAuth(mode = 'login', inviteCode = '') {
  $topbar.hidden = true;
  const first = !state.config.hasUsers;
  if (first) mode = 'signup';
  const signup = mode === 'signup';
  $app.innerHTML = `
    <div class="auth">
      <div class="brand-mark">10</div>
      <h1>${first ? 'Start your group' : signup ? 'Join your friends' : 'Welcome back'}</h1>
      <p class="muted">${
        first
          ? 'You’re the first one here. Create your account, then invite friends from the Friends page.'
          : signup
            ? 'Make your Top 10s and see everyone else’s.'
            : 'Sign in to see your lists and your friends’.'
      }</p>
      <form class="card" id="authForm" novalidate>
        ${signup ? '<div class="field"><label for="displayName">Your name</label><input id="displayName" name="displayName" autocomplete="name" placeholder="e.g. Sam" required></div>' : ''}
        <div class="field"><label for="username">Username</label><input id="username" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required></div>
        <div class="field"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="8" required></div>
        ${signup && !first ? `<div class="field"><label for="inviteCode">Invite code</label><input id="inviteCode" name="inviteCode" value="${esc(inviteCode)}" autocapitalize="none" spellcheck="false" required></div>` : ''}
        <p class="form-error" id="authError"></p>
        <button class="btn primary" style="width:100%" type="submit">${signup ? 'Create account' : 'Sign in'}</button>
      </form>
      ${first ? '' : `<p class="switch-auth">${signup ? 'Already have an account?' : 'New here?'} <button type="button" id="switchAuth">${signup ? 'Sign in' : 'Join with an invite'}</button></p>`}
    </div>`;

  document.getElementById('switchAuth')?.addEventListener('click', () => renderAuth(signup ? 'login' : 'signup', inviteCode));
  document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = Object.fromEntries(new FormData(e.target));
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      const { user } = await api('POST', signup ? '/api/signup' : '/api/login', form);
      state.me = user;
      state.config.hasUsers = true;
      if (location.hash.startsWith('#/join')) location.hash = '#/';
      route();
    } catch (err) {
      document.getElementById('authError').textContent = err.message;
      btn.disabled = false;
    }
  });
  $app.querySelector('input')?.focus();
}

// ---------- home ----------

async function renderHome() {
  loading();
  const [{ lists }, friends, recent] = await Promise.all([api('GET', '/api/my-lists'), api('GET', '/api/friends'), api('GET', '/api/recent')]);
  const byCat = Object.fromEntries(lists.map((l) => [l.category, l]));
  const others = friends.people.filter((p) => !p.isMe);

  $app.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Hi, ${esc(state.me.displayName)}</h1>
        <p class="sub">Pick a list to start ranking. Your friends see your lists automatically.</p>
      </div>
      <button class="btn primary" id="homeLog">+ Log a movie</button>
    </div>
    ${
      friends.recent.length
        ? `<h2 class="section-title" style="margin-top:0">Latest from friends</h2>
           <div class="feed">${friends.recent.slice(0, 3).map(feedItem).join('')}</div>`
        : ''
    }
    ${recent.entries.length ? `<h2 class="section-title"${friends.recent.length ? '' : ' style="margin-top:0"'}>Recently watched by friends</h2>${recentShelf(recent.entries)}` : ''}
    ${friends.recent.length || recent.entries.length ? '<h2 class="section-title">Your lists</h2>' : ''}
    ${
      friends.recent.length || recent.entries.length || others.length
          ? ''
          : `<div class="card" style="margin-bottom:20px">
               <p style="margin-top:0">It’s just you so far. Send your friends the invite link:</p>
               ${inviteRow(friends.inviteCode)}
             </div>`
    }
    ${
      !state.config.moviesConfigured
        ? '<p class="notice">Movie search is turned off because the server has no TMDB or OMDb API key. See the README to enable it.</p>'
        : !state.config.sources.omdb
          ? '<p class="notice">Scores are unavailable because the server has no OMDb API key. See the README to enable them.</p>'
          : ''
    }
    <div class="cat-grid">
      ${state.config.categories
        .map((c) => {
          const l = byCat[c.id];
          const count = l?.count || 0;
          const strip = Array.from({ length: 4 }, (_, i) => {
            const p = l?.preview[i];
            return p?.poster ? `<div><img src="${esc(p.poster)}" alt="" loading="lazy"></div>` : '<div></div>';
          }).join('');
          return `<a class="cat-card" href="#/list/${c.id}">
            <div class="poster-strip">${strip}</div>
            <div><h3>${esc(c.name)}</h3><div class="meta">${count ? `${count} of 10 ranked` : esc(c.blurb)}</div></div>
            <div class="progress"><span style="width:${count * 10}%"></span></div>
          </a>`;
        })
        .join('')}
    </div>`;
  bindInviteRow();
  document.getElementById('homeLog').onclick = () => openJournalSheet(null, () => (location.hash = '#/journal'));
}

function feedItem(l) {
  const cat = state.cats[l.category];
  const posters = l.preview.map((p) => `<div>${p.poster ? `<img src="${esc(p.poster)}" alt="">` : ''}</div>`).join('');
  return `<a class="feed-item" href="#/view/${l.id}">
    ${avatar(l.owner)}
    <div class="text"><strong>${esc(l.owner?.displayName)} · ${esc(cat?.name)}</strong><span>${l.count}/10 · updated ${timeAgo(l.updatedAt)}</span></div>
    <div class="mini-posters" style="padding-left:8px">${posters}</div>
  </a>`;
}

const inviteUrl = (code) => `${location.origin}/#/join/${code}`;
const inviteRow = (code) => `<div class="copy-row"><input readonly value="${esc(inviteUrl(code))}" aria-label="Invite link"><button class="btn primary" data-invite="${esc(code)}">Share</button></div>`;
function bindInviteRow() {
  $app.querySelectorAll('[data-invite]').forEach((b) =>
    b.addEventListener('click', () => shareOrCopy('Join my Top 10 movie group', inviteUrl(b.dataset.invite))),
  );
}

// ---------- my list (editable) ----------

async function renderMyList(categoryId) {
  const cat = state.cats[categoryId];
  if (!cat) return renderNotFound();
  loading();
  const list = await api('GET', `/api/mine/${categoryId}`);
  let items = list.items.map((it) => ({ imdbID: it.movie.imdbID, note: it.note, movie: it.movie }));
  let listId = list.id;
  let shareToken = list.shareToken;
  const openSet = new Set();

  $app.innerHTML = `
    <div class="page-head">
      <div>
        <p class="eyebrow"><a href="#/">← My lists</a></p>
        <h1>Top 10 · ${esc(cat.name)}</h1>
        <p class="sub">${esc(cat.blurb)} Tap a movie for details. Drag or use the arrows to reorder.</p>
      </div>
      <div class="row">
        <a class="btn" href="#/compare/${cat.id}">Compare with friends</a>
        <button class="btn primary" id="shareBtn">Share</button>
      </div>
    </div>
    <div id="adderWrap"></div>
    <ol class="tiles" id="tiles"></ol>
    <div class="list-foot"><button class="btn ghost danger" id="clearBtn">Clear this list</button></div>`;

  const $tiles = document.getElementById('tiles');
  document.getElementById('clearBtn').addEventListener('click', async () => {
    if (!confirm(`Remove all ${items.length} movies from your ${cat.name} list? This also turns off its public link.`)) return;
    items = [];
    draw();
    await save();
    toast('List cleared');
  });

  function draw() {
    $tiles.querySelectorAll('.tile.open').forEach((t) => openSet.add(t.dataset.id));
    $tiles.innerHTML =
      items.map((it, i) => tileHTML(it, i, { editable: true, total: items.length })).join('') +
      Array.from({ length: Math.max(0, 10 - items.length) }, (_, k) =>
        `<li class="empty-slot"><span class="rank">${items.length + k + 1}</span>${k === 0 ? 'Search above to add a movie' : ''}</li>`,
      ).join('');
    $tiles.querySelectorAll('.tile').forEach((t) => {
      if (openSet.has(t.dataset.id)) {
        t.classList.add('open');
        t.querySelector('.tile-main').setAttribute('aria-expanded', 'true');
      }
    });
    bindTileToggles($tiles);
    bindEditing();
    drawAdder();
    document.getElementById('clearBtn').hidden = !items.length;
  }

  let saving = Promise.resolve();
  function save() {
    const payload = { items: items.map(({ imdbID, note }) => ({ imdbID, note })) };
    saving = saving.then(async () => {
      try {
        const saved = await api('PUT', `/api/mine/${categoryId}`, payload);
        listId = saved.id;
        shareToken = saved.shareToken;
      } catch (err) {
        toast(err.message, { error: true });
        renderMyList(categoryId);
      }
    });
    return saving;
  }

  function move(from, to) {
    if (to < 0 || to >= items.length || from === to) return;
    const [it] = items.splice(from, 1);
    items.splice(to, 0, it);
    draw();
    save();
  }

  function bindEditing() {
    $tiles.querySelectorAll('.tile').forEach((tile) => {
      const i = Number(tile.dataset.i);
      tile.querySelector('[data-act=up]')?.addEventListener('click', () => move(i, i - 1));
      tile.querySelector('[data-act=down]')?.addEventListener('click', () => move(i, i + 1));
      tile.querySelector('[data-act=remove]')?.addEventListener('click', () => {
        const removed = items.splice(i, 1)[0];
        draw();
        save();
        toast(`Removed ${removed.movie.title}`);
      });
      const note = tile.querySelector('.note-edit');
      note?.addEventListener('change', () => {
        items[i].note = note.value.trim();
        save().then(() => toast('Note saved'));
      });

      // Drag & drop (desktop). On touch screens the arrow buttons do the job.
      const handle = tile.querySelector('.handle');
      handle.addEventListener('dragstart', (e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(i));
        e.dataTransfer.setDragImage(tile, 20, 20);
        tile.classList.add('dragging');
      });
      handle.addEventListener('dragend', () => tile.classList.remove('dragging'));
      tile.addEventListener('dragover', (e) => {
        e.preventDefault();
        const after = e.offsetY > tile.offsetHeight / 2;
        tile.classList.toggle('drop-after', after);
        tile.classList.toggle('drop-before', !after);
      });
      tile.addEventListener('dragleave', () => tile.classList.remove('drop-before', 'drop-after'));
      tile.addEventListener('drop', (e) => {
        e.preventDefault();
        const after = tile.classList.contains('drop-after');
        tile.classList.remove('drop-before', 'drop-after');
        const from = Number(e.dataTransfer.getData('text/plain'));
        let to = i + (after ? 1 : 0);
        if (from < to) to -= 1;
        move(from, to);
      });
    });
  }

  function drawAdder() {
    const wrap = document.getElementById('adderWrap');
    if (items.length >= 10) {
      wrap.innerHTML = '<p class="notice">Your Top 10 is full. Remove a movie to make room for another.</p>';
      return;
    }
    if (wrap.querySelector('.adder')) return; // keep focus + query while editing
    wrap.innerHTML = `<div class="adder">
      <span class="glass">🔍</span>
      <input class="search-input" id="search" type="search" placeholder="Add a movie, e.g. “Heat 1995”" autocomplete="off" ${state.config.moviesConfigured ? '' : 'disabled'}>
      <ul class="results" id="results" hidden></ul>
    </div>`;
    bindSearch(wrap.querySelector('#search'), wrap.querySelector('#results'));
  }

  function bindSearch($input, $results) {
    const onList = (r) => items.some((it) => it.imdbID === r.imdbID || (r.tmdbId && it.movie?.tmdbId === r.tmdbId));
    moviePicker($input, $results, {
      reasonFor: (r) => (onList(r) ? 'Already on your list' : fits(cat, r.year) ? '' : `Outside ${cat.name}`),
      busyText: (r) => `Adding ${r.title}…`,
      async onPick(r) {
        const movie = await api('GET', `/api/movies/${encodeURIComponent(r.id)}`);
        if (items.some((it) => it.imdbID === movie.imdbID)) throw new Error(`${movie.title} is already on your list`);
        if (!fits(cat, movie.year)) throw new Error(`${movie.title} (${movie.year}) is outside ${cat.name}`);
        items.push({ imdbID: movie.imdbID, note: '', movie });
        draw();
        await save();
        toast(`Added ${movie.title} at #${items.length}`);
      },
    });
  }

  document.getElementById('shareBtn').addEventListener('click', async () => {
    await saving;
    openShareSheet({ cat, getListId: () => listId, getToken: () => shareToken, setToken: (t) => (shareToken = t), count: items.length });
  });

  draw();
  hydrate(items, draw);
}

function openShareSheet({ cat, getListId, getToken, setToken, count }) {
  const listId = getListId();
  const url = (t) => `${location.origin}/s/${t}`;
  const paint = () => {
    const token = getToken();
    $sheet.innerHTML = `<div class="sheet-body">
      <h2>Share “${esc(cat.name)}”</h2>
      <p class="muted" style="margin-top:0">Everyone in your group can already see this list on their Friends page${count ? '' : ' once you add a movie'}.</p>
      ${
        listId
          ? `<label class="toggle"><span><strong>Public link</strong><br><span class="muted" style="font-size:14px">Anyone with the link can view (read-only, no account needed).</span></span>
               <input type="checkbox" id="publicToggle" ${token ? 'checked' : ''}></label>
             ${token ? `<div class="copy-row"><input readonly value="${esc(url(token))}" aria-label="Public link"><button class="btn primary" id="sendLink">Share</button></div>` : ''}`
          : '<p class="notice">Add at least one movie to get a shareable link.</p>'
      }
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn" id="closeSheet">Done</button></div>
    </div>`;
    $sheet.querySelector('#closeSheet').onclick = () => $sheet.close();
    $sheet.querySelector('#sendLink')?.addEventListener('click', () => shareOrCopy(`My Top 10 · ${cat.name}`, url(getToken())));
    $sheet.querySelector('#publicToggle')?.addEventListener('change', async (e) => {
      try {
        const { shareToken } = await api('POST', `/api/lists/${listId}/share`, { enabled: e.target.checked });
        setToken(shareToken);
        paint();
      } catch (err) {
        toast(err.message, { error: true });
      }
    });
  };
  paint();
  $sheet.showModal();
}

// ---------- someone's list (read-only) ----------

async function renderViewList(listId, { shared = false } = {}) {
  loading();
  const list = await api('GET', shared ? `/api/shared/${listId}` : `/api/lists/${listId}`);
  if (list.isOwner && !shared) {
    location.replace(`#/list/${list.category}`);
    return;
  }
  const cat = state.cats[list.category] || state.config.categories.find((c) => c.id === list.category);
  const items = list.items.map((it) => ({ note: it.note, movie: it.movie }));

  $app.innerHTML = `
    <div class="page-head">
      <div>
        ${shared ? '' : '<p class="eyebrow"><a href="#/friends">← Friends</a></p>'}
        <div class="row" style="gap:10px">${avatar(list.owner, 'lg')}<div>
          <h1>${esc(list.owner?.displayName)}’s Top 10</h1>
          <p class="sub" style="margin:2px 0 0">${esc(cat?.name)} · updated ${timeAgo(list.updatedAt)}</p>
        </div></div>
      </div>
      ${shared ? '' : `<div class="row"><a class="btn" href="#/compare/${list.category}">Compare everyone</a><a class="btn primary" href="#/list/${list.category}">Make yours</a></div>`}
    </div>
    <ol class="tiles" id="tiles"></ol>
    ${shared ? '<p class="muted" style="text-align:center;margin-top:28px">Shared from <strong>Top 10</strong>.</p>' : ''}`;

  const $tiles = document.getElementById('tiles');
  const draw = () => {
    const open = new Set([...$tiles.querySelectorAll('.tile.open')].map((t) => t.dataset.id));
    $tiles.innerHTML = items.map((it, i) => tileHTML(it, i)).join('') || '<p class="notice">This list is empty.</p>';
    $tiles.querySelectorAll('.tile').forEach((t) => open.has(t.dataset.id) && t.classList.add('open'));
    bindTileToggles($tiles);
  };
  draw();
  if (!shared) hydrate(items, draw);
}

// ---------- compare ----------

async function renderCompare(categoryId) {
  const cat = state.cats[categoryId];
  if (!cat) return renderNotFound();
  loading();
  const data = await api('GET', `/api/compare/${categoryId}`);
  const counts = {};
  data.lists.forEach((l) => l.items.forEach((it) => (counts[it.movie.imdbID] = (counts[it.movie.imdbID] || 0) + 1)));

  $app.innerHTML = `
    <div class="page-head">
      <div>
        <p class="eyebrow"><a href="#/friends">← Friends</a></p>
        <h1>Compare · ${esc(cat.name)}</h1>
        <p class="sub">The group ranking awards 10 points for a #1 pick down to 1 point for #10.</p>
      </div>
    </div>
    <nav class="tabs">${state.config.categories.map((c) => `<a class="chip ${c.id === cat.id ? 'active' : ''}" href="#/compare/${c.id}">${esc(c.name)}</a>`).join('')}</nav>
    ${
      data.lists.length
        ? `<h2 class="section-title" style="margin-top:8px">Group ranking</h2>
           <div class="consensus">${data.consensus
             .map(
               (c, i) => `<div class="consensus-row">
                 <div class="rank">${i + 1}</div>
                 ${posterImg(c.movie.poster)}
                 <div><strong>${esc(c.movie.title)}</strong> <span class="muted">${esc(c.movie.year || '')}</span></div>
                 <div><div class="pickers">${c.picks.map((p) => avatar(p.user, 'sm')).join('')}</div><div class="pts">${c.points} pts</div></div>
               </div>`,
             )
             .join('')}</div>
           <h2 class="section-title">Everyone’s lists</h2>
           <div class="columns">${data.lists
             .map(
               (l) => `<div class="col">
                 <h3>${avatar(l.owner, 'sm')}<a href="#/view/${l.id}">${esc(l.owner?.displayName)}</a></h3>
                 <ol>${l.items.map((it) => `<li class="${counts[it.movie.imdbID] > 1 ? 'shared' : ''}">${esc(it.movie.title)}</li>`).join('')}</ol>
               </div>`,
             )
             .join('')}</div>
           <p class="muted" style="font-size:13px">Bold titles appear on more than one person’s list.</p>`
        : `<div class="card">Nobody has ranked ${esc(cat.name)} yet. <a href="#/list/${cat.id}">Be the first →</a></div>`
    }`;
}

// ---------- journal ----------

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function fmtWatched(w) {
  if (!w || w.length === 4) return '';
  const d = new Date(`${w}T12:00:00`);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(d.getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });
}

// Read-only stars: a grey row with a gold row clipped on top.
function stars(rating, size = '') {
  if (rating == null) return '<span class="stars-none">no rating</span>';
  return `<span class="stars ${size}" role="img" aria-label="${rating} out of 5 stars" title="${rating} / 5"><span class="stars-fill" style="width:${(rating / 5) * 100}%"></span></span>`;
}

// Half-star picker: a transparent range input laid over the stars.
function starInputHTML(value) {
  return `<div class="star-input">
    <div class="stars lg"><span class="stars-fill" style="width:${((value || 0) / 5) * 100}%"></span>
      <input type="range" min="0" max="5" step="0.5" value="${value || 0}" aria-label="Rating out of 5 stars"></div>
    <span class="star-value">${value ? `${value} / 5` : 'No rating'}</span>
    <button type="button" class="btn ghost star-clear" ${value ? '' : 'hidden'}>Clear</button>
  </div>`;
}
function bindStarInput(root, onChange) {
  const input = root.querySelector('.star-input input');
  const fill = root.querySelector('.star-input .stars-fill');
  const label = root.querySelector('.star-value');
  const clear = root.querySelector('.star-clear');
  const set = (v) => {
    input.value = v;
    fill.style.width = `${(v / 5) * 100}%`;
    label.textContent = v ? `${v} / 5` : 'No rating';
    clear.hidden = !v;
    onChange(v ? Number(v) : null);
  };
  input.addEventListener('input', () => set(Math.max(0, Number(input.value))));
  clear.addEventListener('click', () => set(0));
}

async function renderJournal() {
  loading();
  const { entries } = await api('GET', '/api/journal');
  let filter = '';

  $app.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Movie journal</h1>
        <p class="sub">Your private notes on everything you watch. Friends see what you watched and your stars — never your notes.</p>
      </div>
      <div class="row">
        <button class="btn" id="importBtn">Import notes</button>
        <button class="btn primary" id="logBtn">+ Log a movie</button>
      </div>
    </div>
    ${entries.length ? '<div class="adder"><span class="glass">🔍</span><input class="search-input" id="jFilter" type="search" placeholder="Search your journal" autocomplete="off"></div>' : ''}
    <div id="jList"></div>`;

  const $list = document.getElementById('jList');
  function draw() {
    if (!entries.length) {
      $list.innerHTML = `<div class="card journal-empty">
        <p style="margin-top:0"><strong>Nothing logged yet.</strong></p>
        <p class="muted">Log the next movie you watch, or bring in the notes you already keep — paste them in and we’ll match every movie for you.</p>
        <div class="row"><button class="btn primary" data-act="log">+ Log a movie</button><button class="btn" data-act="import">Import notes</button></div>
      </div>`;
      $list.querySelector('[data-act=log]').onclick = () => openJournalSheet(null, renderJournal);
      $list.querySelector('[data-act=import]').onclick = () => openImportSheet(renderJournal);
      return;
    }
    const q = filter.toLowerCase();
    const shown = entries.filter((e) => !q || e.movie.title.toLowerCase().includes(q) || e.note.toLowerCase().includes(q));
    const years = [...new Set(shown.map((e) => e.watchedOn.slice(0, 4)))];
    $list.innerHTML = years.length
      ? years
          .map((y) => {
            const group = shown.filter((e) => e.watchedOn.startsWith(y));
            const rated = group.filter((e) => e.rating != null);
            const avg = rated.length ? (rated.reduce((n, e) => n + e.rating, 0) / rated.length).toFixed(1) : null;
            return `<section class="j-year">
              <h2 class="section-title j-year-head"><span>${y}</span><span class="muted">${group.length} movie${group.length === 1 ? '' : 's'}${avg ? ` · avg ${avg}★` : ''}</span></h2>
              <ul class="j-entries">${group.map(entryHTML).join('')}</ul>
            </section>`;
          })
          .join('')
      : '<p class="muted">Nothing matches that search.</p>';
    $list.querySelectorAll('.j-entry').forEach((el) =>
      el.addEventListener('click', () => openJournalSheet(entries.find((e) => e.id === el.dataset.id), renderJournal)),
    );
  }
  function entryHTML(e) {
    return `<li class="j-entry" data-id="${esc(e.id)}" tabindex="0" role="button" aria-label="Edit ${esc(e.movie.title)}">
      ${posterImg(e.movie.poster, 'j-poster')}
      <div class="j-body">
        <div class="j-top">
          <h3>${esc(e.movie.title)} <span class="year">${esc(e.movie.year || '')}</span></h3>
          <span class="j-when">${fmtWatched(e.watchedOn)}${e.hidden ? ' · <span title="Hidden from friends">🔒</span>' : ''}</span>
        </div>
        ${stars(e.rating)}
        ${e.note ? `<p class="j-note">${esc(e.note)}</p>` : ''}
      </div>
    </li>`;
  }

  document.getElementById('logBtn').onclick = () => openJournalSheet(null, renderJournal);
  document.getElementById('importBtn').onclick = () => openImportSheet(renderJournal);
  document.getElementById('jFilter')?.addEventListener('input', (e) => {
    filter = e.target.value.trim();
    draw();
  });
  $list.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('j-entry')) {
      e.preventDefault();
      e.target.click();
    }
  });
  draw();
}

// Create (entry = null) or edit a journal entry.
function openJournalSheet(entry, onDone) {
  const state = {
    movieId: null,
    movie: entry?.movie || null,
    rating: entry?.rating ?? null,
    watchedOn: entry?.watchedOn || today(),
  };
  const yearOnly = state.watchedOn.length === 4;

  $sheet.innerHTML = `<form class="sheet-body" id="jForm">
    <h2>${entry ? 'Edit entry' : 'Log a movie'}</h2>
    <div class="field">
      <label for="jSearch">Movie</label>
      <div id="jPicked"></div>
      <div class="adder" style="margin:0"><span class="glass">🔍</span>
        <input class="search-input" id="jSearch" type="search" placeholder="${entry ? 'Search to change the movie' : 'Search for a movie'}" autocomplete="off">
        <ul class="results" id="jResults" hidden></ul>
      </div>
    </div>
    <div class="field"><label>Your rating</label>${starInputHTML(state.rating)}</div>
    <div class="field">
      <label for="jDate">Watched on</label>
      ${
        yearOnly
          ? `<div class="row"><span class="chip">Sometime in ${esc(state.watchedOn)}</span><button type="button" class="btn ghost" id="jSetDate">Set exact date</button></div>
             <input id="jDate" type="date" max="${today()}" hidden>`
          : `<input id="jDate" type="date" value="${esc(state.watchedOn)}" max="${today()}" required>`
      }
    </div>
    <div class="field">
      <label for="jNote">Your thoughts <span class="muted" style="font-weight:400">(private — only you see this)</span></label>
      <textarea id="jNote" class="note-edit" maxlength="2000" rows="4" placeholder="What did you think?">${esc(entry?.note || '')}</textarea>
    </div>
    <label class="check"><input type="checkbox" id="jHidden" ${entry?.hidden ? 'checked' : ''}> Hide this one from friends’ “Recently watched”</label>
    <p class="form-error" id="jError"></p>
    <div class="row" style="justify-content:space-between">
      ${entry ? '<button type="button" class="btn danger" id="jDelete">Delete</button>' : '<span></span>'}
      <div class="row"><button type="button" class="btn" id="jCancel">Cancel</button><button type="submit" class="btn primary">${entry ? 'Save' : 'Add to journal'}</button></div>
    </div>
  </form>`;

  const paintPicked = () => {
    const m = state.movie;
    $sheet.querySelector('#jPicked').innerHTML = m
      ? `<div class="picked">${posterImg(m.poster, 'j-poster sm')}<div><strong>${esc(m.title)}</strong> <span class="muted">${esc(m.year || '')}</span></div></div>`
      : '';
  };
  paintPicked();
  moviePicker($sheet.querySelector('#jSearch'), $sheet.querySelector('#jResults'), {
    busyText: (r) => `Selected ${r.title}`,
    async onPick(r) {
      state.movieId = r.id;
      state.movie = { title: r.title, year: r.year, poster: r.poster };
      paintPicked();
    },
  });
  bindStarInput($sheet, (v) => (state.rating = v));
  $sheet.querySelector('#jSetDate')?.addEventListener('click', (e) => {
    const input = $sheet.querySelector('#jDate');
    input.hidden = false;
    const endOfYear = `${state.watchedOn}-12-31`;
    input.value = endOfYear > today() ? today() : endOfYear;
    e.target.closest('.row').remove();
    input.focus();
  });
  $sheet.querySelector('#jCancel').onclick = () => $sheet.close();
  $sheet.querySelector('#jDelete')?.addEventListener('click', async () => {
    if (!confirm(`Delete your entry for ${entry.movie.title}?`)) return;
    try {
      await api('DELETE', `/api/journal/${entry.id}`);
      $sheet.close();
      toast('Entry deleted');
      onDone();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  $sheet.querySelector('#jForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const $err = $sheet.querySelector('#jError');
    if (!state.movie) return ($err.textContent = 'Search for the movie you watched first.');
    const dateInput = $sheet.querySelector('#jDate');
    const body = {
      rating: state.rating,
      note: $sheet.querySelector('#jNote').value,
      watchedOn: dateInput.hidden ? state.watchedOn : dateInput.value,
      hidden: $sheet.querySelector('#jHidden').checked,
    };
    if (state.movieId) body.movieId = state.movieId;
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      await api(entry ? 'PATCH' : 'POST', entry ? `/api/journal/${entry.id}` : '/api/journal', body);
      $sheet.close();
      toast(entry ? 'Saved' : `Logged ${state.movie.title}`);
      onDone();
    } catch (err) {
      $err.textContent = err.message;
      btn.disabled = false;
    }
  });
  $sheet.showModal();
  if (!entry) $sheet.querySelector('#jSearch').focus();
}

// Paste a notes file → review the matches → import.
function openImportSheet(onDone) {
  $sheet.innerHTML = `<div class="sheet-body sheet-wide">
    <h2>Import your movie notes</h2>
    <p class="muted" style="margin-top:0">Paste your notes below. Each movie goes on its own line, like
      <code>Companion (2025) - 4 - A perfect blend…</code>. A line with just a year (like <code>2026</code>) means the movies under it were watched that year.</p>
    <textarea id="impText" class="note-edit" rows="10" placeholder="2026&#10;Companion (2025) - 4 - A perfect blend of light horror with dark sci fi.&#10;Heretic (2024) - 4 - A great horror film…"></textarea>
    <label class="check" style="margin-top:10px">Within each year, my most recent movie is at the
      <select id="impOrder"><option value="bottom">bottom</option><option value="top">top</option></select></label>
    <p class="form-error" id="impError"></p>
    <div class="row" style="justify-content:flex-end"><button class="btn" id="impCancel">Cancel</button><button class="btn primary" id="impNext">Find my movies</button></div>
  </div>`;
  $sheet.querySelector('#impCancel').onclick = () => $sheet.close();
  $sheet.querySelector('#impNext').onclick = async (e) => {
    const text = $sheet.querySelector('#impText').value;
    const newestAt = $sheet.querySelector('#impOrder').value;
    if (!text.trim()) return ($sheet.querySelector('#impError').textContent = 'Paste your notes first.');
    e.target.disabled = true;
    e.target.textContent = 'Matching movies…';
    try {
      const preview = await api('POST', '/api/journal/import/preview', { text });
      showImportReview(preview, newestAt, onDone);
    } catch (err) {
      $sheet.querySelector('#impError').textContent = err.message;
      e.target.disabled = false;
      e.target.textContent = 'Find my movies';
    }
  };
  $sheet.showModal();
  $sheet.querySelector('#impText').focus();
}

function showImportReview({ entries, skipped }, newestAt, onDone) {
  const rows = entries.map((e) => ({ ...e, include: true, movieId: e.match?.id || null }));
  const matched = rows.filter((r) => r.match).length;
  $sheet.innerHTML = `<div class="sheet-body sheet-wide">
    <h2>Check the matches</h2>
    <p class="muted" style="margin-top:0">Found <strong>${rows.length}</strong> movies; matched <strong>${matched}</strong> to a poster and details.
      Untick anything you don’t want. Unmatched movies are still imported with the title you wrote.</p>
    <ul class="imp-list">${rows
      .map(
        (r, i) => `<li class="imp-row ${r.match ? '' : 'unmatched'}">
          <input type="checkbox" checked data-i="${i}" aria-label="Import ${esc(r.title)}">
          ${posterImg(r.match?.poster, 'j-poster sm')}
          <div class="imp-text">
            <div><strong>${esc(r.title)}</strong> <span class="muted">(${esc(r.year)})</span> ${stars(r.rating, 'sm')}</div>
            <div class="imp-sub">${
              r.match
                ? `${r.match.title !== r.title || r.match.year !== r.year ? `Matched to <strong>${esc(r.match.title)}</strong> (${esc(r.match.year)}) · ` : ''}watched ${r.watchedYear}`
                : `<span class="warn">No match found</span> · watched ${r.watchedYear}`
            }${r.note ? ` · “${esc(r.note.slice(0, 60))}${r.note.length > 60 ? '…' : ''}”` : ''}</div>
          </div>
        </li>`,
      )
      .join('')}</ul>
    ${
      skipped.length
        ? `<details class="imp-skipped"><summary>${skipped.length} line${skipped.length === 1 ? '' : 's'} weren’t movies and will be skipped</summary>
            <ul>${skipped.map((s) => `<li><span class="muted">Line ${s.line}:</span> ${esc(s.text)}</li>`).join('')}</ul></details>`
        : ''
    }
    <p class="form-error" id="impError"></p>
    <div class="row" style="justify-content:flex-end"><button class="btn" id="impBack">Back</button><button class="btn primary" id="impGo">Import ${rows.length} movies</button></div>
  </div>`;

  const $go = $sheet.querySelector('#impGo');
  const count = () => rows.filter((r) => r.include).length;
  $sheet.querySelectorAll('.imp-row input').forEach((cb) =>
    cb.addEventListener('change', () => {
      rows[cb.dataset.i].include = cb.checked;
      $go.textContent = `Import ${count()} movies`;
      $go.disabled = !count();
    }),
  );
  $sheet.querySelector('#impBack').onclick = () => openImportSheet(onDone);
  $go.onclick = async () => {
    $go.disabled = true;
    $go.textContent = 'Importing…';
    try {
      const picked = rows
        .filter((r) => r.include)
        .map(({ title, year, rating, note, watchedYear, movieId }) => ({ title, year, rating, note, watchedYear, movieId }));
      const { imported, duplicates } = await api('POST', '/api/journal/import', { entries: picked, newestAt });
      $sheet.close();
      toast(`Imported ${imported} movie${imported === 1 ? '' : 's'}${duplicates ? ` (${duplicates} already in your journal)` : ''}`);
      onDone();
    } catch (err) {
      $sheet.querySelector('#impError').textContent = err.message;
      $go.disabled = false;
      $go.textContent = `Import ${count()} movies`;
    }
  };
  $sheet.scrollTop = 0;
}

// Friends' recently watched, as a horizontal shelf of posters.
function recentShelf(entries) {
  return `<div class="shelf">${entries
    .map(
      (e) => `<div class="shelf-item" title="${esc(e.user.displayName)} watched ${esc(e.movie.title)}">
        <div class="shelf-poster">${posterImg(e.movie.poster)}<span class="shelf-avatar">${avatar(e.user, 'sm')}</span></div>
        <div class="shelf-title">${esc(e.movie.title)}</div>
        <div class="shelf-meta">${stars(e.rating, 'sm')}</div>
        <div class="shelf-meta muted">${esc(e.user.displayName)} · ${fmtWatched(e.watchedOn)}</div>
      </div>`,
    )
    .join('')}</div>`;
}

// ---------- friends ----------

async function renderFriends() {
  loading();
  const data = await api('GET', '/api/friends');
  const others = data.people.filter((p) => !p.isMe);
  const owner = data.viewerIsOwner;
  const catOrder = (id) => state.config.categories.findIndex((c) => c.id === id);

  $app.innerHTML = `
    <div class="page-head">
      <div><h1>Friends</h1><p class="sub">${data.people.length} of ${data.maxUsers} spots used. Everyone here can see each other’s lists.</p></div>
    </div>
    <div class="card" style="margin-bottom:24px">
      <strong>Invite a friend</strong>
      <p class="muted" style="margin:4px 0 0;font-size:14px">Send this link. It takes them straight to sign-up with the invite code filled in.</p>
      ${inviteRow(data.inviteCode)}
      ${owner ? '<button class="btn ghost" id="rotateInvite" style="padding-left:0">Make a new invite link (the old one stops working)</button>' : ''}
    </div>

    <h2 class="section-title" style="margin-top:0">Compare by list</h2>
    <nav class="tabs">${state.config.categories.map((c) => `<a class="chip" href="#/compare/${c.id}">${esc(c.name)}</a>`).join('')}</nav>

    <h2 class="section-title">People</h2>
    ${others.length ? '' : '<p class="muted">No one else has joined yet.</p>'}
    ${data.people
      .map(
        (p) => `<div class="person">
          <div class="person-head">${avatar(p, 'lg')}<div style="flex:1;min-width:0"><h3>${esc(p.displayName)}${p.isMe ? ' <span class="muted">(you)</span>' : ''}${p.isOwner ? ' <span class="badge">owner</span>' : ''}</h3>
            <span class="muted" style="font-size:13px">@${esc(p.username)}${p.lastActive ? ` · active ${timeAgo(p.lastActive)}` : ''}</span></div>
            ${owner && !p.isMe ? `<button class="icon-btn" data-manage="${esc(p.id)}" aria-label="Manage ${esc(p.displayName)}" title="Manage">⋯</button>` : ''}
          </div>
          <div class="chips">${
            p.lists.length
              ? p.lists
                  .sort((a, b) => catOrder(a.category) - catOrder(b.category))
                  .map((l) => `<a class="chip" href="${p.isMe ? `#/list/${l.category}` : `#/view/${l.id}`}">${esc(state.cats[l.category]?.name)} <small>${l.count}/10</small></a>`)
                  .join('')
              : '<span class="muted" style="font-size:14px">No lists yet</span>'
          }</div>
          ${
            p.watched?.length
              ? `<p class="watched-line"><span class="muted">Recently watched:</span> ${p.watched.map((w) => `${esc(w.title)}${w.rating != null ? ` <span class="muted">${w.rating}★</span>` : ''}`).join(' · ')}</p>`
              : ''
          }
        </div>`,
      )
      .join('')}`;
  bindInviteRow();

  document.getElementById('rotateInvite')?.addEventListener('click', async () => {
    if (!confirm('Make a new invite link? Anyone holding the old link won’t be able to join with it.')) return;
    try {
      await api('POST', '/api/invite/rotate');
      toast('New invite link ready');
      renderFriends();
    } catch (err) {
      toast(err.message, { error: true });
    }
  });

  $app.querySelectorAll('[data-manage]').forEach((b) =>
    b.addEventListener('click', () => openMemberSheet(data.people.find((p) => p.id === b.dataset.manage))),
  );
}

// Owner-only: reset a member's password, or remove them from the group.
function openMemberSheet(person) {
  $sheet.innerHTML = `<div class="sheet-body">
    <div class="row" style="gap:12px">${avatar(person, 'lg')}<div><h2 style="margin:0">${esc(person.displayName)}</h2><span class="muted">@${esc(person.username)}</span></div></div>
    <div class="sheet-section">
      <strong>Forgot their password?</strong>
      <p class="muted" style="margin:4px 0 0;font-size:14px">Make a one-time link that lets them choose a new password. It works for 24 hours.</p>
      <div id="resetOut"><button class="btn" id="makeReset" style="margin-top:10px">Create reset link</button></div>
    </div>
    <div class="sheet-section">
      <strong>Remove from group</strong>
      <p class="muted" style="margin:4px 0 0;font-size:14px">Deletes their account and all their lists. This can’t be undone.</p>
      <button class="btn danger" id="removeMember" style="margin-top:10px">Remove ${esc(person.displayName)}</button>
    </div>
    <div class="row" style="justify-content:flex-end;margin-top:16px"><button class="btn" id="closeSheet">Done</button></div>
  </div>`;
  $sheet.querySelector('#closeSheet').onclick = () => $sheet.close();
  $sheet.querySelector('#makeReset').onclick = async () => {
    try {
      const { path } = await api('POST', `/api/users/${person.id}/reset-link`);
      const url = location.origin + path;
      $sheet.querySelector('#resetOut').innerHTML = `<div class="copy-row"><input readonly value="${esc(url)}" aria-label="Reset link"><button class="btn primary" id="sendReset">Share</button></div>`;
      $sheet.querySelector('#sendReset').onclick = () => shareOrCopy(`Reset your Top 10 password`, url);
    } catch (err) {
      toast(err.message, { error: true });
    }
  };
  $sheet.querySelector('#removeMember').onclick = async () => {
    if (!confirm(`Remove ${person.displayName} and delete all of their lists?`)) return;
    try {
      await api('DELETE', `/api/users/${person.id}`);
      $sheet.close();
      toast(`${person.displayName} was removed`);
      renderFriends();
    } catch (err) {
      toast(err.message, { error: true });
    }
  };
  $sheet.showModal();
}

// Reached from a reset link; works whether or not someone is signed in.
async function renderReset(token) {
  $topbar.hidden = true;
  loading();
  let who;
  try {
    who = await api('GET', `/api/reset/${encodeURIComponent(token)}`);
  } catch (err) {
    $app.innerHTML = `<div class="auth"><div class="brand-mark">10</div><h1>Link expired</h1><p class="muted">${esc(err.message)}</p><a class="btn" href="#/">Go to sign in</a></div>`;
    return;
  }
  $app.innerHTML = `
    <div class="auth">
      <div class="brand-mark">10</div>
      <h1>New password</h1>
      <p class="muted">Hi ${esc(who.displayName)}, choose a new password for <strong>@${esc(who.username)}</strong>.</p>
      <form class="card" id="resetForm" novalidate>
        <div class="field"><label for="password">New password</label><input id="password" name="password" type="password" autocomplete="new-password" minlength="8" required></div>
        <p class="form-error" id="resetError"></p>
        <button class="btn primary" style="width:100%" type="submit">Save and sign in</button>
      </form>
    </div>`;
  $app.querySelector('#password').focus();
  $app.querySelector('#resetForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    try {
      const { user } = await api('POST', `/api/reset/${encodeURIComponent(token)}`, { password: e.target.password.value });
      state.me = user;
      toast('Password updated');
      location.replace('#/');
      route();
    } catch (err) {
      $app.querySelector('#resetError').textContent = err.message;
      btn.disabled = false;
    }
  });
}

function renderNotFound() {
  $app.innerHTML = '<div class="card">That page doesn’t exist. <a href="#/">Go home</a></div>';
}

// ---------- account menu ----------

document.getElementById('userMenuBtn').addEventListener('click', () => {
  $sheet.innerHTML = `<div class="sheet-body">
    <div class="row" style="gap:12px">${avatar(state.me, 'lg')}<div><h2 style="margin:0" id="meName">${esc(state.me.displayName)}</h2><span class="muted">@${esc(state.me.username)}${state.me.isOwner ? ' · group owner' : ''}</span></div></div>

    <form class="sheet-section" id="nameForm">
      <div class="field"><label for="displayName">Display name</label>
        <div class="copy-row" style="margin:0"><input id="displayName" name="displayName" value="${esc(state.me.displayName)}" maxlength="40" autocomplete="name"><button class="btn" type="submit">Save</button></div>
      </div>
    </form>

    <form class="sheet-section" id="pwForm">
      <strong>Change password</strong>
      <div class="field" style="margin-top:10px"><label for="pwCurrent">Current password</label><input id="pwCurrent" name="current" type="password" autocomplete="current-password" required></div>
      <div class="field"><label for="pwNext">New password</label><input id="pwNext" name="next" type="password" autocomplete="new-password" minlength="8" required></div>
      <p class="form-error" id="pwError"></p>
      <button class="btn" type="submit">Update password</button>
      <p class="muted" style="font-size:13px;margin:8px 0 0">This signs you out on your other devices.</p>
    </form>

    <div class="row" style="justify-content:space-between;margin-top:18px">
      <button class="btn danger" id="logoutBtn">Sign out</button>
      <button class="btn" id="closeSheet">Done</button>
    </div>
  </div>`;
  $sheet.querySelector('#closeSheet').onclick = () => $sheet.close();
  $sheet.querySelector('#logoutBtn').onclick = async () => {
    await api('POST', '/api/logout');
    state.me = null;
    $sheet.close();
    location.hash = '#/';
    route();
  };
  $sheet.querySelector('#nameForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const { user } = await api('PATCH', '/api/me', { displayName: e.target.displayName.value });
      state.me = user;
      $sheet.querySelector('#meName').textContent = user.displayName;
      document.getElementById('userMenuBtn').innerHTML = avatar(user);
      $sheet.addEventListener('close', route, { once: true }); // refresh greetings etc. behind the sheet
      toast('Name updated');
    } catch (err) {
      toast(err.message, { error: true });
    }
  });
  $sheet.querySelector('#pwForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err$ = $sheet.querySelector('#pwError');
    err$.textContent = '';
    try {
      await api('POST', '/api/me/password', { current: e.target.current.value, next: e.target.next.value });
      e.target.reset();
      toast('Password updated');
    } catch (err) {
      err$.textContent = err.message;
    }
  });
  $sheet.showModal();
});
$sheet.addEventListener('click', (e) => e.target === $sheet && $sheet.close());

// ---------- router ----------

async function route() {
  window.scrollTo(0, 0);
  const sharedMatch = location.pathname.match(/^\/s\/([\w-]+)/);
  try {
    if (sharedMatch) {
      $topbar.hidden = true;
      return await renderViewList(sharedMatch[1], { shared: true });
    }

    const [, page = '', arg = ''] = location.hash.replace(/^#\/?/, '/').split('/');
    if (page === 'reset') return await renderReset(decodeURIComponent(arg));
    if (!state.me) return renderAuth(page === 'join' ? 'signup' : 'login', page === 'join' ? decodeURIComponent(arg) : '');
    if (page === 'join') {
      location.replace('#/');
      return;
    }

    $topbar.hidden = false;
    document.getElementById('userMenuBtn').innerHTML = avatar(state.me);
    const navKey = page === 'friends' || page === 'compare' || page === 'view' ? 'friends' : page === 'journal' ? 'journal' : 'home';
    document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === navKey));

    if (page === '') return await renderHome();
    if (page === 'list') return await renderMyList(arg);
    if (page === 'view') return await renderViewList(arg);
    if (page === 'compare') return await renderCompare(arg);
    if (page === 'friends') return await renderFriends();
    if (page === 'journal') return await renderJournal();
    renderNotFound();
  } catch (err) {
    $app.innerHTML = `<div class="card"><strong>Something went wrong.</strong><p class="muted">${esc(err.message)}</p><a class="btn" href="#/">Go home</a></div>`;
  }
}

async function boot() {
  try {
    state.config = await api('GET', '/api/config');
  } catch {
    $app.innerHTML = '<div class="card">Can’t reach the server. Is it running?</div>';
    return;
  }
  state.me = state.config.user;
  state.cats = Object.fromEntries(state.config.categories.map((c) => [c.id, c]));
  window.addEventListener('hashchange', route);
  route();
}

boot();
