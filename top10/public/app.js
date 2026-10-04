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
  const [{ lists }, friends] = await Promise.all([api('GET', '/api/my-lists'), api('GET', '/api/friends')]);
  const byCat = Object.fromEntries(lists.map((l) => [l.category, l]));
  const others = friends.people.filter((p) => !p.isMe);

  $app.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Hi, ${esc(state.me.displayName)}</h1>
        <p class="sub">Pick a list to start ranking. Your friends see your lists automatically.</p>
      </div>
    </div>
    ${
      friends.recent.length
        ? `<h2 class="section-title" style="margin-top:0">Latest from friends</h2>
           <div class="feed">${friends.recent.slice(0, 3).map(feedItem).join('')}</div>
           <h2 class="section-title">Your lists</h2>`
        : others.length
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
      <input class="search-input" id="search" type="search" placeholder="Add a movie — search by title (add a year to narrow it)" autocomplete="off" ${state.config.moviesConfigured ? '' : 'disabled'}>
      <ul class="results" id="results" hidden></ul>
    </div>`;
    bindSearch(wrap.querySelector('#search'), wrap.querySelector('#results'));
  }

  function bindSearch($input, $results) {
    let timer;
    let results = [];
    let active = -1;
    let seq = 0;

    const close = () => {
      $results.hidden = true;
      active = -1;
    };
    const paint = () => {
      if (!results.length) {
        $results.innerHTML = '<li class="result disabled"><span class="muted">No movies found</span></li>';
        $results.hidden = false;
        return;
      }
      $results.innerHTML = results
        .map((r, i) => {
          const already = onList(r);
          const ok = fits(cat, r.year);
          const reason = already ? 'Already on your list' : ok ? '' : `Outside ${cat.name}`;
          return `<li class="result ${reason ? 'disabled' : ''} ${i === active ? 'active' : ''}" data-i="${i}">
            ${r.poster ? `<img src="${esc(r.poster)}" alt="">` : '<div class="ph"></div>'}
            <div><div class="r-title">${esc(r.title)}</div><div class="r-sub">${esc(r.year)}${reason ? ` · ${reason}` : ''}</div></div>
          </li>`;
        })
        .join('');
      $results.hidden = false;
    };
    const selectable = (i) => {
      const r = results[i];
      return r && fits(cat, r.year) && !onList(r);
    };

    const onList = (r) => items.some((it) => it.imdbID === r.imdbID || (r.tmdbId && it.movie?.tmdbId === r.tmdbId));

    async function pick(i) {
      if (!selectable(i)) return;
      const r = results[i];
      close();
      $input.value = '';
      $input.disabled = true;
      $input.placeholder = `Adding ${r.title}…`;
      try {
        const movie = await api('GET', `/api/movies/${encodeURIComponent(r.id)}`);
        if (items.some((it) => it.imdbID === movie.imdbID)) throw new Error(`${movie.title} is already on your list`);
        if (!fits(cat, movie.year)) throw new Error(`${movie.title} (${movie.year}) is outside ${cat.name}`);
        items.push({ imdbID: movie.imdbID, note: '', movie });
        draw();
        await save();
        toast(`Added ${movie.title} at #${items.length}`);
      } catch (err) {
        toast(err.message, { error: true });
      } finally {
        const fresh = document.getElementById('search');
        if (fresh) {
          fresh.disabled = false;
          fresh.placeholder = 'Add a movie — search by title (add a year to narrow it)';
          fresh.focus();
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
    const navKey = page === 'friends' || page === 'compare' || page === 'view' ? 'friends' : 'home';
    document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === navKey));

    if (page === '') return await renderHome();
    if (page === 'list') return await renderMyList(arg);
    if (page === 'view') return await renderViewList(arg);
    if (page === 'compare') return await renderCompare(arg);
    if (page === 'friends') return await renderFriends();
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
