import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
// Keys can live in top10/.env (see .env.example). Real env vars win.
try {
  process.loadEnvFile(path.join(here, '.env'));
} catch {}

const { Store } = await import('./lib/store.js');
const { MovieService, httpError } = await import('./lib/movies.js');
const { CATEGORIES, MAX_ITEMS, getCategory, yearFits } = await import('./lib/categories.js');
const auth = await import('./lib/auth.js');
const journal = await import('./lib/journal.js');

const PUBLIC_DIR = path.join(here, 'public');
const PORT = Number(process.env.PORT || 4100);
const DATA_FILE = process.env.DATA_FILE || path.join(here, 'data', 'top10.json');
const MAX_USERS = Number(process.env.MAX_USERS || 10);
const SESSION_DAYS = 60;

const store = new Store(DATA_FILE);
const movies = new MovieService(store, {
  omdbKey: process.env.OMDB_API_KEY,
  tmdbKey: process.env.TMDB_API_KEY,
  anthropicKey: process.env.ANTHROPIC_API_KEY,
});
const { data } = store;

// Invite code: fixed via env, otherwise generated once and kept in the db.
if (process.env.INVITE_CODE) data.inviteCode = process.env.INVITE_CODE;
if (!data.inviteCode) data.inviteCode = auth.newToken(5);
// The group owner is whoever signed up first (older data files predate this).
if (!data.ownerId && data.users.length) data.ownerId = data.users[0].id;
store.save();

// ---------- helpers ----------

function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i <= 0) continue;
    try {
      out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    } catch {}
  }
  return out;
}

function send(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 100_000) throw httpError(413, 'Request too large');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  let body;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw httpError(400, 'Invalid JSON');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw httpError(400, 'Expected a JSON object');
  return body;
}

function currentSession(req) {
  const token = parseCookies(req).sid;
  if (!token) return null;
  const hashed = auth.sha256(token);
  const session = data.sessions.find((s) => s.token === hashed);
  if (!session || session.expiresAt < Date.now()) return null;
  const user = data.users.find((u) => u.id === session.userId);
  return user ? { session, user } : null;
}

function startSession(req, res, user) {
  const token = auth.newToken();
  const expiresAt = Date.now() + SESSION_DAYS * 86400_000;
  data.sessions = data.sessions.filter((s) => s.expiresAt > Date.now());
  data.sessions.push({ token: auth.sha256(token), userId: user.id, expiresAt });
  store.save();
  const secure = req.headers['x-forwarded-proto'] === 'https' || process.env.COOKIE_SECURE === '1';
  res.setHeader('set-cookie', `sid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}${secure ? '; Secure' : ''}`);
}

const isOwner = (u) => Boolean(u) && u.id === data.ownerId;
const publicUser = (u) => ({ id: u.id, username: u.username, displayName: u.displayName, color: u.color, isOwner: isOwner(u) });

// Avatar colors: warm, painterly, and all readable with white text.
const COLORS = ['#c9552a', '#3f84ad', '#5a8a35', '#b0577a', '#b87d1e', '#6f5fa3', '#2f8478', '#9a4f35'];
const OLD_COLORS = ['#e4572e', '#17bebb', '#ffc914', '#76b041', '#a259ff', '#ff6f91', '#2e86de', '#f39c12'];
for (const u of data.users) {
  const i = OLD_COLORS.indexOf(u.color);
  if (i >= 0) u.color = COLORS[i];
}

function validDisplayName(name) {
  const n = String(name || '').trim();
  if (!n) throw httpError(400, 'Please enter a name.');
  if (n.length > 40) throw httpError(400, 'That name is too long (40 characters max).');
  return n;
}

// Brake on password / invite-code guessing. Only failures count, keyed by
// what's being guessed, so a group sharing one IP (or a proxy) never locks
// itself out by signing in normally.
const failures = new Map();
const WINDOW_MS = 15 * 60_000;
function checkThrottle(key) {
  const rec = failures.get(key);
  if (rec && rec.reset > Date.now() && rec.count >= 10) throw httpError(429, 'Too many attempts. Try again in a few minutes.');
}
function recordFailure(key) {
  const now = Date.now();
  const rec = failures.get(key);
  if (!rec || rec.reset < now) failures.set(key, { count: 1, reset: now + WINDOW_MS });
  else rec.count += 1;
}

function requireOwner(me) {
  if (!isOwner(me)) throw httpError(403, 'Only the group owner can do that.');
}

function removeUser(userId) {
  data.users = data.users.filter((u) => u.id !== userId);
  data.lists = data.lists.filter((l) => l.ownerId !== userId);
  data.sessions = data.sessions.filter((s) => s.userId !== userId);
  data.resets = (data.resets || []).filter((r) => r.userId !== userId);
  data.journal = (data.journal || []).filter((e) => e.userId !== userId);
  store.save();
}

// ---------- list shaping ----------

function movieFor(item) {
  const cached = movies.peek(item.imdbID);
  return cached ? { ...cached, fetchedAt: undefined } : { imdbID: item.imdbID, title: item.title, year: item.year, scores: {} };
}

function listSummary(list) {
  const owner = data.users.find((u) => u.id === list.ownerId);
  return {
    id: list.id,
    category: list.category,
    owner: owner ? publicUser(owner) : null,
    count: list.items.length,
    updatedAt: list.updatedAt,
    preview: list.items.slice(0, 4).map((i) => ({ imdbID: i.imdbID, title: i.title, poster: movies.peek(i.imdbID)?.poster || null })),
  };
}

function listDetail(list, viewer) {
  const mine = Boolean(viewer) && viewer.id === list.ownerId;
  return {
    ...listSummary(list),
    isOwner: mine,
    shareToken: mine ? list.shareToken || null : undefined,
    items: list.items.map((item, i) => ({ rank: i + 1, note: item.note || '', movie: movieFor(item) })),
  };
}

// Warm the movie cache for anything on a list that isn't cached yet (or has
// gone stale) so later page loads have full details and fresh scores.
function warm(list) {
  for (const item of list.items) movies.get(item.imdbID).catch(() => {});
}

// ---------- routes ----------

const routes = [];
const route = (method, pattern, handler, { auth: needsAuth = true } = {}) => {
  const keys = [];
  const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)'))}$`);
  routes.push({ method, re, keys, handler, needsAuth });
};

route('GET', '/api/config', async (req, { me }) => ({
  categories: CATEGORIES,
  maxItems: MAX_ITEMS,
  moviesConfigured: movies.configured,
  sources: movies.sources,
  hasUsers: data.users.length > 0,
  user: me ? publicUser(me) : null,
}), { auth: false });

// ----- accounts -----

route('POST', '/api/signup', async (req, { res }) => {
  const body = await readJson(req);
  const username = String(body.username || '').trim().toLowerCase();
  const displayName = validDisplayName(body.displayName || username);
  const password = String(body.password || '');
  const first = data.users.length === 0;

  if (!first) {
    checkThrottle('invite');
    if (String(body.inviteCode || '').trim() !== data.inviteCode) {
      recordFailure('invite');
      throw httpError(403, 'That invite code is not valid. Ask a friend for their invite link.');
    }
  }
  if (data.users.length >= MAX_USERS) throw httpError(403, 'This group is full.');
  if (!/^[a-z0-9_.-]{2,24}$/.test(username)) throw httpError(400, 'Usernames are 2–24 characters: letters, numbers, dot, dash or underscore.');
  const bad = auth.validatePassword(password);
  if (bad) throw httpError(400, bad);
  if (data.users.some((u) => u.username === username)) throw httpError(409, 'That username is taken.');

  const user = {
    id: auth.newId(),
    username,
    displayName,
    password: auth.hashPassword(password),
    color: COLORS[data.users.length % COLORS.length],
    createdAt: Date.now(),
  };
  data.users.push(user);
  if (first) data.ownerId = user.id;
  startSession(req, res, user);
  return { user: publicUser(user) };
}, { auth: false });

route('POST', '/api/login', async (req, { res }) => {
  const body = await readJson(req);
  const username = String(body.username || '').trim().toLowerCase();
  checkThrottle(`login:${username}`);
  const user = data.users.find((u) => u.username === username);
  if (!auth.checkPassword(String(body.password || ''), user?.password)) {
    recordFailure(`login:${username}`);
    throw httpError(401, 'Wrong username or password.');
  }
  startSession(req, res, user);
  return { user: publicUser(user) };
}, { auth: false });

route('POST', '/api/logout', async (req, { res, session }) => {
  if (session) {
    data.sessions = data.sessions.filter((s) => s !== session);
    store.save();
  }
  res.setHeader('set-cookie', 'sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
  return { ok: true };
}, { auth: false });

route('PATCH', '/api/me', async (req, { me }) => {
  const body = await readJson(req);
  me.displayName = validDisplayName(body.displayName);
  store.save();
  return { user: publicUser(me) };
});

// Changing your password signs you out everywhere else.
route('POST', '/api/me/password', async (req, { me, session }) => {
  const body = await readJson(req);
  checkThrottle(`login:${me.username}`);
  if (!auth.checkPassword(String(body.current || ''), me.password)) {
    recordFailure(`login:${me.username}`);
    throw httpError(400, 'Your current password is incorrect.');
  }
  const bad = auth.validatePassword(body.next || '');
  if (bad) throw httpError(400, bad);
  me.password = auth.hashPassword(String(body.next));
  data.sessions = data.sessions.filter((s) => s.userId !== me.id || s === session);
  store.save();
  return { ok: true };
});

// ----- password reset (owner creates a one-time link, member uses it) -----

route('POST', '/api/users/:id/reset-link', async (req, { me, params }) => {
  requireOwner(me);
  const user = data.users.find((u) => u.id === params.id);
  if (!user) throw httpError(404, 'No such member.');
  const token = auth.createReset(data, user.id);
  store.save();
  return { path: `/#/reset/${token}`, hours: auth.RESET_HOURS };
});

route('GET', '/api/reset/:token', async (req, { params }) => {
  const reset = auth.findReset(data, params.token);
  const user = reset && data.users.find((u) => u.id === reset.userId);
  if (!user) throw httpError(404, 'This reset link has expired or was already used. Ask the group owner for a new one.');
  return { displayName: user.displayName, username: user.username };
}, { auth: false });

route('POST', '/api/reset/:token', async (req, { res, params }) => {
  const body = await readJson(req);
  const reset = auth.findReset(data, params.token);
  const user = reset && data.users.find((u) => u.id === reset.userId);
  if (!user) throw httpError(404, 'This reset link has expired or was already used. Ask the group owner for a new one.');
  const bad = auth.validatePassword(body.password || '');
  if (bad) throw httpError(400, bad);
  user.password = auth.hashPassword(String(body.password));
  data.resets = data.resets.filter((r) => r !== reset);
  data.sessions = data.sessions.filter((s) => s.userId !== user.id);
  startSession(req, res, user);
  return { user: publicUser(user) };
}, { auth: false });

// ----- group management (owner) -----

route('DELETE', '/api/users/:id', async (req, { me, params }) => {
  requireOwner(me);
  if (params.id === me.id) throw httpError(400, 'You can’t remove yourself as the owner.');
  if (!data.users.some((u) => u.id === params.id)) throw httpError(404, 'No such member.');
  removeUser(params.id);
  return { ok: true };
});

route('POST', '/api/invite/rotate', async (req, { me }) => {
  requireOwner(me);
  if (process.env.INVITE_CODE) throw httpError(400, 'The invite code is fixed by the INVITE_CODE setting on the server. Change it there.');
  data.inviteCode = auth.newToken(5);
  store.save();
  return { inviteCode: data.inviteCode };
});

// ----- lists -----

// Everyone in the group, with their lists, newest activity first.
route('GET', '/api/friends', async (req, { me }) => {
  const people = data.users.map((u) => {
    const lists = data.lists.filter((l) => l.ownerId === u.id && l.items.length).map(listSummary);
    const lastActive = Math.max(0, ...lists.map((l) => l.updatedAt));
    const watched = (data.journal || [])
      .filter((e) => e.userId === u.id && shareable(e))
      .sort(byNewest)
      .slice(0, 3)
      .map((e) => ({ title: journalMovie(e).title, rating: e.rating, watchedOn: e.watchedOn }));
    return { ...publicUser(u), isMe: u.id === me.id, lists, lastActive, watched };
  });
  people.sort((a, b) => (a.isMe ? -1 : b.isMe ? 1 : b.lastActive - a.lastActive));
  const recent = data.lists
    .filter((l) => l.ownerId !== me.id && l.items.length)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 8)
    .map(listSummary);
  return { people, recent, inviteCode: data.inviteCode, maxUsers: MAX_USERS, viewerIsOwner: isOwner(me) };
});

route('GET', '/api/my-lists', async (req, { me }) => ({
  lists: data.lists.filter((l) => l.ownerId === me.id).map(listSummary),
}));

route('GET', '/api/lists/:id', async (req, { me, params }) => {
  const list = data.lists.find((l) => l.id === params.id);
  if (!list) throw httpError(404, 'List not found');
  warm(list);
  return listDetail(list, me);
});

// The signed-in user's list for a category (empty if not started yet).
route('GET', '/api/mine/:category', async (req, { me, params }) => {
  if (!getCategory(params.category)) throw httpError(404, 'Unknown category');
  const list = data.lists.find((l) => l.ownerId === me.id && l.category === params.category);
  if (!list) return listDetail({ id: null, ownerId: me.id, category: params.category, items: [], updatedAt: 0 }, me);
  warm(list);
  return listDetail(list, me);
});

// Save the whole ordered list in one go; the client sends the full array
// after every add / remove / reorder / note edit. Saving an empty list
// deletes it (and its public link).
route('PUT', '/api/mine/:category', async (req, { me, params }) => {
  const category = getCategory(params.category);
  if (!category) throw httpError(404, 'Unknown category');
  const body = await readJson(req);
  const incoming = Array.isArray(body.items) ? body.items : null;
  if (!incoming) throw httpError(400, 'items must be an array');
  if (incoming.length > MAX_ITEMS) throw httpError(400, `A Top 10 has at most ${MAX_ITEMS} movies.`);

  const items = [];
  for (const raw of incoming) {
    const movie = await movies.get(String(raw?.imdbID || ''));
    if (items.some((i) => i.imdbID === movie.imdbID)) throw httpError(400, 'Each movie can only appear once.');
    if (!yearFits(category, movie.year)) throw httpError(400, `${movie.title} (${movie.year}) doesn't fit ${category.name}. ${category.blurb}`);
    items.push({ imdbID: movie.imdbID, title: movie.title, year: movie.year, note: String(raw.note || '').slice(0, 280) });
  }

  let list = data.lists.find((l) => l.ownerId === me.id && l.category === category.id);
  if (!items.length) {
    if (list) data.lists = data.lists.filter((l) => l !== list);
    store.save();
    return listDetail({ id: null, ownerId: me.id, category: category.id, items: [], updatedAt: 0 }, me);
  }
  if (!list) {
    list = { id: auth.newId(), ownerId: me.id, category: category.id, items: [], shareToken: null, createdAt: Date.now() };
    data.lists.push(list);
  }
  list.items = items;
  list.updatedAt = Date.now();
  store.save();
  return listDetail(list, me);
});

// Turn the public read-only link on or off.
route('POST', '/api/lists/:id/share', async (req, { me, params }) => {
  const list = data.lists.find((l) => l.id === params.id && l.ownerId === me.id);
  if (!list) throw httpError(404, 'List not found');
  const { enabled } = await readJson(req);
  list.shareToken = enabled ? list.shareToken || auth.newToken(12) : null;
  store.save();
  return { shareToken: list.shareToken };
});

// Everyone's take on one category, plus a points-based group ranking
// (#1 = 10 points ... #10 = 1 point).
route('GET', '/api/compare/:category', async (req, { me, params }) => {
  if (!getCategory(params.category)) throw httpError(404, 'Unknown category');
  const lists = data.lists.filter((l) => l.category === params.category && l.items.length);
  const tally = new Map();
  for (const list of lists) {
    const owner = data.users.find((u) => u.id === list.ownerId);
    list.items.forEach((item, i) => {
      const t = tally.get(item.imdbID) || { movie: movieFor(item), points: 0, picks: [] };
      t.points += MAX_ITEMS - i;
      t.picks.push({ user: owner ? publicUser(owner) : null, rank: i + 1 });
      tally.set(item.imdbID, t);
    });
  }
  const consensus = [...tally.values()]
    .sort((a, b) => b.points - a.points || b.picks.length - a.picks.length)
    .slice(0, MAX_ITEMS);
  return { lists: lists.map((l) => listDetail(l, me)), consensus };
});

// ----- movie journal -----
// Notes are private to their author. Friends only ever see the movie, the
// star rating and the date, and only for dated entries not marked hidden
// (imported, year-only history never shows up as "recently watched").

data.journal ||= [];
data.journalSeq ||= 0;

function journalMovie(e) {
  const cached = e.imdbID && movies.peek(e.imdbID);
  return cached
    ? { imdbID: cached.imdbID, title: cached.title, year: cached.year, poster: cached.poster, director: cached.director }
    : { imdbID: e.imdbID, title: e.title, year: e.year, poster: null };
}

const journalOut = (e) => ({
  id: e.id, watchedOn: e.watchedOn, rating: e.rating, note: e.note, hidden: Boolean(e.hidden), movie: journalMovie(e),
});

const byNewest = (a, b) => journal.sortKey(b).localeCompare(journal.sortKey(a));
const shareable = (e) => !e.hidden && e.watchedOn.length === 10;

// Fetch details for imported movies one at a time in the background, so a
// big import never floods the movie APIs.
let warmQueue = Promise.resolve();
const warmLater = (id) => (warmQueue = warmQueue.then(() => movies.get(id).catch(() => {})));

async function journalFields(body, existing = {}) {
  const out = {};
  if (body.movieId) {
    const movie = await movies.get(String(body.movieId));
    Object.assign(out, { imdbID: movie.imdbID, title: movie.title, year: movie.year });
  } else if (!existing.id || body.title !== undefined) {
    const title = String(body.title || '').trim();
    if (!title || title.length > 200) throw httpError(400, 'Pick a movie (or type a title).');
    const year = String(body.year || '').trim();
    if (year && !/^\d{4}$/.test(year)) throw httpError(400, 'Release year should be four digits.');
    Object.assign(out, { imdbID: null, title, year: year || null });
  }
  if (!existing.id || 'rating' in body) out.rating = journal.validRating(body.rating);
  if (!existing.id || 'note' in body) {
    const note = String(body.note || '');
    if (note.length > journal.MAX_NOTE) throw httpError(400, `Notes are limited to ${journal.MAX_NOTE} characters.`);
    out.note = note.trim();
  }
  if (!existing.id || 'watchedOn' in body) out.watchedOn = journal.validWatchedOn(body.watchedOn);
  if (!existing.id || 'hidden' in body) out.hidden = Boolean(body.hidden);
  return out;
}

route('GET', '/api/journal', async (req, { me }) => ({
  entries: data.journal.filter((e) => e.userId === me.id).sort(byNewest).map(journalOut),
}));

route('POST', '/api/journal', async (req, { me }) => {
  const body = await readJson(req);
  const entry = { id: auth.newId(), userId: me.id, seq: ++data.journalSeq, createdAt: Date.now(), ...(await journalFields(body)) };
  entry.updatedAt = entry.createdAt;
  data.journal.push(entry);
  store.save();
  return journalOut(entry);
});

route('PATCH', '/api/journal/:id', async (req, { me, params }) => {
  const entry = data.journal.find((e) => e.id === params.id && e.userId === me.id);
  if (!entry) throw httpError(404, 'Journal entry not found');
  Object.assign(entry, await journalFields(await readJson(req), entry), { updatedAt: Date.now() });
  store.save();
  return journalOut(entry);
});

route('DELETE', '/api/journal/:id', async (req, { me, params }) => {
  const before = data.journal.length;
  data.journal = data.journal.filter((e) => !(e.id === params.id && e.userId === me.id));
  if (data.journal.length === before) throw httpError(404, 'Journal entry not found');
  store.save();
  return { ok: true };
});

// Step 1 of importing a notes file: parse it and suggest a movie for each
// line. Nothing is saved yet.
route('POST', '/api/journal/import/preview', async (req) => {
  const { text } = await readJson(req);
  if (String(text || '').length > 500_000) throw httpError(413, 'That’s a lot of notes! Try importing a year at a time.');
  const { entries, skipped } = journal.parseNotes(text);
  if (entries.length > 1000) throw httpError(400, 'Import up to 1,000 movies at a time.');

  const findMatch = async (e) => {
    if (!movies.configured) return null;
    try {
      const exact = await movies.search(`${e.title} ${e.year}`);
      if (exact.length) return exact[0];
      // Release years in notes are often off by one (festival vs. release).
      const loose = await movies.search(e.title);
      return loose.find((r) => Math.abs(Number(r.year) - Number(e.year)) <= 1) || null;
    } catch {
      return null;
    }
  };
  const matches = new Array(entries.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (next < entries.length) {
        const i = next++;
        matches[i] = await findMatch(entries[i]);
      }
    }),
  );
  return {
    entries: entries.map((e, i) => ({
      ...e,
      match: matches[i] && { id: matches[i].id, title: matches[i].title, year: matches[i].year, poster: matches[i].poster },
    })),
    skipped,
  };
});

// Step 2: save the reviewed entries. `newestAt` says whether each year's
// most recent movie is at the bottom (default) or top of the notes.
route('POST', '/api/journal/import', async (req, { me }) => {
  const body = await readJson(req);
  const incoming = Array.isArray(body.entries) ? body.entries : null;
  if (!incoming) throw httpError(400, 'entries must be an array');
  if (incoming.length > 1000) throw httpError(400, 'Import up to 1,000 movies at a time.');
  const ordered = body.newestAt === 'top' ? [...incoming].reverse() : incoming;

  const prepared = [];
  for (const raw of ordered) {
    let imdbID = null;
    if (raw.movieId) {
      try {
        imdbID = await movies.resolve(String(raw.movieId));
      } catch {}
    }
    const title = String(raw.title || '').trim().slice(0, 200);
    if (!title) continue;
    const year = /^\d{4}$/.test(String(raw.year)) ? String(raw.year) : null;
    prepared.push({
      imdbID,
      title,
      year,
      rating: journal.validRating(raw.rating),
      note: String(raw.note || '').slice(0, journal.MAX_NOTE).trim(),
      watchedOn: journal.validWatchedOn(String(raw.watchedYear || new Date().getFullYear())),
    });
  }

  const mine = data.journal.filter((e) => e.userId === me.id);
  const seen = new Set(mine.map((e) => `${e.imdbID || e.title.toLowerCase()}|${e.watchedOn}`));
  let imported = 0;
  let duplicates = 0;
  const now = Date.now();
  for (const e of prepared) {
    const key = `${e.imdbID || e.title.toLowerCase()}|${e.watchedOn}`;
    if (seen.has(key)) {
      duplicates++;
      continue;
    }
    seen.add(key);
    data.journal.push({ id: auth.newId(), userId: me.id, seq: ++data.journalSeq, createdAt: now, updatedAt: now, hidden: false, ...e });
    if (e.imdbID) warmLater(e.imdbID);
    imported++;
  }
  store.save();
  return { imported, duplicates };
});

// What friends have been watching lately (never includes notes).
route('GET', '/api/recent', async (req, { me }) => {
  const entries = data.journal
    .filter((e) => e.userId !== me.id && shareable(e))
    .sort(byNewest)
    .slice(0, 24)
    .map((e) => {
      const user = data.users.find((u) => u.id === e.userId);
      return { id: e.id, user: user && publicUser(user), watchedOn: e.watchedOn, rating: e.rating, movie: journalMovie(e) };
    })
    .filter((e) => e.user);
  return { entries };
});

// ----- movies -----

route('GET', '/api/movies/search', async (req) => {
  const q = new URL(req.url, 'http://x').searchParams.get('q');
  return { results: await movies.search(q) };
});

// Accepts an IMDb id ("tt0111161") or a TMDB search result id ("tmdb:278").
route('GET', '/api/movies/:id', async (req, { params }) => {
  const m = await movies.get(params.id);
  return { ...m, fetchedAt: undefined };
});

// Public, read-only view of a list for people outside the group.
route('GET', '/api/shared/:token', async (req, { params }) => {
  const list = data.lists.find((l) => l.shareToken && l.shareToken === params.token);
  if (!list) throw httpError(404, 'This link is no longer shared.');
  warm(list);
  return listDetail(list, null);
}, { auth: false });

// ---------- static files ----------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

function serveStatic(req, res, pathname) {
  let file;
  try {
    file = path.normalize(path.join(PUBLIC_DIR, decodeURIComponent(pathname)));
  } catch {
    return send(res, 400, { error: 'Bad request' });
  }
  if (file !== PUBLIC_DIR && !file.startsWith(PUBLIC_DIR + path.sep)) return send(res, 403, { error: 'Forbidden' });
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(PUBLIC_DIR, 'index.html');
  res.writeHead(200, {
    'content-type': MIME[path.extname(file)] || 'application/octet-stream',
    'cache-control': file.endsWith('index.html') ? 'no-cache' : 'public, max-age=300',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'same-origin',
    'x-frame-options': 'DENY',
    'content-security-policy':
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' https: data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  });
  fs.createReadStream(file).pipe(res);
}

// ---------- server ----------

const server = http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, 'http://x');
    if (!pathname.startsWith('/api/')) return serveStatic(req, res, pathname);

    // Mutations must carry a custom header, which cross-site forms can't set.
    if (req.method !== 'GET' && req.headers['x-top10'] !== '1') throw httpError(403, 'Missing request header');
    for (const r of routes) {
      if (r.method !== req.method) continue;
      const m = pathname.match(r.re);
      if (!m) continue;
      let params;
      try {
        params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      } catch {
        throw httpError(400, 'Bad request');
      }
      const current = currentSession(req);
      if (r.needsAuth && !current) throw httpError(401, 'Please sign in.');
      const result = await r.handler(req, { me: current?.user || null, session: current?.session || null, res, params });
      return send(res, 200, result);
    }
    throw httpError(404, 'Not found');
  } catch (err) {
    if (!err.status) console.error(err);
    if (!res.headersSent) send(res, err.status || 500, { error: err.status ? err.message : 'Something went wrong.' });
  }
});

server.listen(PORT, () => {
  console.log(`Top 10 is running at http://localhost:${PORT}`);
  const s = movies.sources;
  if (!s.omdb && !s.tmdb) console.warn('  ! Neither TMDB_API_KEY nor OMDB_API_KEY is set — movie search is disabled.');
  else {
    if (!s.omdb) console.warn('  ! OMDB_API_KEY not set — IMDb, Rotten Tomatoes and Metacritic scores will be missing.');
    if (!s.tmdb) console.log('  · TMDB_API_KEY not set — searching via OMDb; cast comes from OMDb (often only 3 names).');
  }
  if (!s.claude) console.log('  · ANTHROPIC_API_KEY not set — descriptions use IMDb’s short plot instead of a spoiler-free rewrite.');
});

// Daily snapshot of the data file (data/backups, last 14 days kept).
const backup = () => {
  try {
    store.backup();
  } catch (err) {
    console.warn(`[backup] ${err.message}`);
  }
};
backup();
setInterval(backup, 24 * 3600_000).unref();

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    store.flush();
    process.exit(0);
  });
}
