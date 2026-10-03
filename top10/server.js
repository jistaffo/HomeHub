import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Store } from './lib/store.js';
import { MovieService, httpError } from './lib/movies.js';
import { CATEGORIES, MAX_ITEMS, getCategory, yearFits } from './lib/categories.js';

const here = path.dirname(fileURLToPath(import.meta.url));
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

// Invite code: fixed via env, otherwise generated once and kept in the db.
if (process.env.INVITE_CODE) store.data.inviteCode = process.env.INVITE_CODE;
if (!store.data.inviteCode) {
  store.data.inviteCode = crypto.randomBytes(5).toString('hex');
  store.save();
}

// ---------- helpers ----------

const id = () => crypto.randomBytes(9).toString('base64url');
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function checkPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(test, Buffer.from(hash, 'hex'));
}

function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function send(res, status, body, headers = {}) {
  const json = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
  res.end(json);
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
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw httpError(400, 'Invalid JSON');
  }
}

function currentUser(req) {
  const token = parseCookies(req).sid;
  if (!token) return null;
  const hashed = sha256(token);
  const session = store.data.sessions.find((s) => s.token === hashed);
  if (!session || session.expiresAt < Date.now()) return null;
  return store.data.users.find((u) => u.id === session.userId) || null;
}

function startSession(req, res, user) {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + SESSION_DAYS * 86400_000;
  store.data.sessions = store.data.sessions.filter((s) => s.expiresAt > Date.now());
  store.data.sessions.push({ token: sha256(token), userId: user.id, expiresAt });
  store.save();
  const secure = req.headers['x-forwarded-proto'] === 'https' || process.env.COOKIE_SECURE === '1';
  return `sid=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}${secure ? '; Secure' : ''}`;
}

const publicUser = (u) => ({ id: u.id, username: u.username, displayName: u.displayName, color: u.color });

const COLORS = ['#e4572e', '#17bebb', '#ffc914', '#76b041', '#a259ff', '#ff6f91', '#2e86de', '#f39c12'];

// Simple in-memory brake on password guessing.
const attempts = new Map();
function throttle(key) {
  const now = Date.now();
  const rec = attempts.get(key) || { count: 0, reset: now + 15 * 60_000 };
  if (now > rec.reset) Object.assign(rec, { count: 0, reset: now + 15 * 60_000 });
  rec.count += 1;
  attempts.set(key, rec);
  if (rec.count > 10) throw httpError(429, 'Too many attempts. Try again in a few minutes.');
}

// ---------- list shaping ----------

function movieFor(item) {
  const cached = movies.peek(item.imdbID);
  return cached ? { ...cached, fetchedAt: undefined } : { imdbID: item.imdbID, title: item.title, year: item.year, scores: {} };
}

function listSummary(list) {
  const owner = store.data.users.find((u) => u.id === list.ownerId);
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
  const isOwner = viewer && viewer.id === list.ownerId;
  return {
    ...listSummary(list),
    isOwner,
    shareToken: isOwner ? list.shareToken || null : undefined,
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
const route = (method, pattern, handler, { auth = true } = {}) => {
  const keys = [];
  const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)'))}$`);
  routes.push({ method, re, keys, handler, auth });
};

route('GET', '/api/config', async (req) => ({
  categories: CATEGORIES,
  maxItems: MAX_ITEMS,
  moviesConfigured: movies.configured,
  hasUsers: store.data.users.length > 0,
  user: (() => {
    const u = currentUser(req);
    return u ? publicUser(u) : null;
  })(),
}), { auth: false });

route('POST', '/api/signup', async (req, { res }) => {
  const body = await readJson(req);
  throttle(`signup:${req.socket.remoteAddress}`);
  const username = String(body.username || '').trim().toLowerCase();
  const displayName = String(body.displayName || '').trim() || username;
  const password = String(body.password || '');
  const first = store.data.users.length === 0;

  if (!first && String(body.inviteCode || '').trim() !== store.data.inviteCode) throw httpError(403, 'That invite code is not valid. Ask a friend for their invite link.');
  if (store.data.users.length >= MAX_USERS) throw httpError(403, 'This group is full.');
  if (!/^[a-z0-9_.-]{2,24}$/.test(username)) throw httpError(400, 'Usernames are 2–24 characters: letters, numbers, dot, dash or underscore.');
  if (displayName.length > 40) throw httpError(400, 'Display name is too long.');
  if (password.length < 8) throw httpError(400, 'Use a password of at least 8 characters.');
  if (store.data.users.some((u) => u.username === username)) throw httpError(409, 'That username is taken.');

  const user = {
    id: id(),
    username,
    displayName,
    password: hashPassword(password),
    color: COLORS[store.data.users.length % COLORS.length],
    createdAt: Date.now(),
  };
  store.data.users.push(user);
  res.setHeader('set-cookie', startSession(req, res, user));
  return { user: publicUser(user) };
}, { auth: false });

route('POST', '/api/login', async (req, { res }) => {
  const body = await readJson(req);
  throttle(`login:${req.socket.remoteAddress}`);
  const username = String(body.username || '').trim().toLowerCase();
  const user = store.data.users.find((u) => u.username === username);
  if (!user || !checkPassword(String(body.password || ''), user.password)) throw httpError(401, 'Wrong username or password.');
  res.setHeader('set-cookie', startSession(req, res, user));
  return { user: publicUser(user) };
}, { auth: false });

route('POST', '/api/logout', async (req, { res }) => {
  const token = parseCookies(req).sid;
  if (token) {
    store.data.sessions = store.data.sessions.filter((s) => s.token !== sha256(token));
    store.save();
  }
  res.setHeader('set-cookie', 'sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
  return { ok: true };
}, { auth: false });

// Everyone in the group, with their lists, newest activity first.
route('GET', '/api/friends', async (req, { me }) => {
  const people = store.data.users.map((u) => {
    const lists = store.data.lists.filter((l) => l.ownerId === u.id && l.items.length).map(listSummary);
    const lastActive = Math.max(0, ...lists.map((l) => l.updatedAt));
    return { ...publicUser(u), isMe: u.id === me.id, lists, lastActive };
  });
  people.sort((a, b) => (a.isMe ? -1 : b.isMe ? 1 : b.lastActive - a.lastActive));
  const recent = store.data.lists
    .filter((l) => l.ownerId !== me.id && l.items.length)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 8)
    .map(listSummary);
  return { people, recent, inviteCode: store.data.inviteCode, maxUsers: MAX_USERS };
});

route('GET', '/api/my-lists', async (req, { me }) => {
  const mine = store.data.lists.filter((l) => l.ownerId === me.id);
  return { lists: mine.map(listSummary) };
});

route('GET', '/api/lists/:id', async (req, { me, params: { id: listId } }) => {
  const list = store.data.lists.find((l) => l.id === listId);
  if (!list) throw httpError(404, 'List not found');
  warm(list);
  return listDetail(list, me);
});

// The signed-in user's list for a category (created empty on first open).
route('GET', '/api/mine/:category', async (req, { me, params: { category } }) => {
  if (!getCategory(category)) throw httpError(404, 'Unknown category');
  const list = store.data.lists.find((l) => l.ownerId === me.id && l.category === category);
  if (!list) return { ...listDetail({ id: null, ownerId: me.id, category, items: [], updatedAt: 0 }, me) };
  warm(list);
  return listDetail(list, me);
});

// Save the whole ordered list in one go; the client sends the full array
// after every add / remove / reorder / note edit.
route('PUT', '/api/mine/:category', async (req, { me, params: { category: categoryId } }) => {
  const category = getCategory(categoryId);
  if (!category) throw httpError(404, 'Unknown category');
  const body = await readJson(req);
  const incoming = Array.isArray(body.items) ? body.items : null;
  if (!incoming) throw httpError(400, 'items must be an array');
  if (incoming.length > MAX_ITEMS) throw httpError(400, `A Top 10 has at most ${MAX_ITEMS} movies.`);

  const seen = new Set();
  const items = [];
  for (const raw of incoming) {
    const imdbID = String(raw?.imdbID || '');
    if (seen.has(imdbID)) throw httpError(400, 'Each movie can only appear once.');
    seen.add(imdbID);
    const movie = movies.peek(imdbID) || (await movies.get(imdbID));
    if (!yearFits(category, movie.year)) throw httpError(400, `${movie.title} (${movie.year}) doesn't fit ${category.name}. ${category.blurb}`);
    items.push({ imdbID, title: movie.title, year: movie.year, note: String(raw.note || '').slice(0, 280) });
  }

  let list = store.data.lists.find((l) => l.ownerId === me.id && l.category === category.id);
  if (!list) {
    list = { id: id(), ownerId: me.id, category: category.id, items: [], shareToken: null, createdAt: Date.now() };
    store.data.lists.push(list);
  }
  list.items = items;
  list.updatedAt = Date.now();
  store.save();
  return listDetail(list, me);
});

// Turn the public read-only link on or off.
route('POST', '/api/lists/:id/share', async (req, { me, params: { id: listId } }) => {
  const list = store.data.lists.find((l) => l.id === listId && l.ownerId === me.id);
  if (!list) throw httpError(404, 'List not found');
  const { enabled } = await readJson(req);
  list.shareToken = enabled ? list.shareToken || crypto.randomBytes(12).toString('base64url') : null;
  store.save();
  return { shareToken: list.shareToken };
});

// Everyone's take on one category, plus a points-based group ranking
// (#1 = 10 points ... #10 = 1 point).
route('GET', '/api/compare/:category', async (req, { me, params: { category } }) => {
  if (!getCategory(category)) throw httpError(404, 'Unknown category');
  const lists = store.data.lists.filter((l) => l.category === category && l.items.length);
  const tally = new Map();
  for (const list of lists) {
    list.items.forEach((item, i) => {
      const t = tally.get(item.imdbID) || { movie: movieFor(item), points: 0, picks: [] };
      t.points += MAX_ITEMS - i;
      const owner = store.data.users.find((u) => u.id === list.ownerId);
      t.picks.push({ user: owner ? publicUser(owner) : null, rank: i + 1 });
      tally.set(item.imdbID, t);
    });
  }
  const consensus = [...tally.values()]
    .sort((a, b) => b.points - a.points || b.picks.length - a.picks.length)
    .slice(0, MAX_ITEMS);
  return { lists: lists.map((l) => listDetail(l, me)), consensus };
});

route('GET', '/api/movies/search', async (req) => {
  const q = new URL(req.url, 'http://x').searchParams.get('q');
  return { results: await movies.search(q) };
});

route('GET', '/api/movies/:imdbID', async (req, { me, params: { imdbID } }) => {
  const m = await movies.get(imdbID);
  return { ...m, fetchedAt: undefined };
});

// Public, read-only view of a list for people outside the group.
route('GET', '/api/shared/:token', async (req, { params: { token } }) => {
  const list = store.data.lists.find((l) => l.shareToken && l.shareToken === token);
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
  let file = path.normalize(path.join(PUBLIC_DIR, decodeURIComponent(pathname)));
  if (!file.startsWith(PUBLIC_DIR)) return send(res, 403, { error: 'Forbidden' });
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(PUBLIC_DIR, 'index.html');
  res.writeHead(200, {
    'content-type': MIME[path.extname(file)] || 'application/octet-stream',
    'cache-control': file.endsWith('index.html') ? 'no-cache' : 'public, max-age=300',
  });
  fs.createReadStream(file).pipe(res);
}

// ---------- server ----------

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://x');
  if (!pathname.startsWith('/api/')) return serveStatic(req, res, pathname);

  try {
    // Mutations must carry a custom header, which cross-site forms can't set.
    if (req.method !== 'GET' && req.headers['x-top10'] !== '1') throw httpError(403, 'Missing request header');
    for (const r of routes) {
      if (r.method !== req.method) continue;
      const m = pathname.match(r.re);
      if (!m) continue;
      const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
      const me = currentUser(req);
      if (r.auth && !me) throw httpError(401, 'Please sign in.');
      const result = await r.handler(req, { me, res, params });
      return send(res, 200, result);
    }
    throw httpError(404, 'Not found');
  } catch (err) {
    if (!err.status) console.error(err);
    send(res, err.status || 500, { error: err.status ? err.message : 'Something went wrong.' });
  }
});

server.listen(PORT, () => {
  console.log(`Top 10 is running at http://localhost:${PORT}`);
  if (!movies.configured) console.warn('  ! OMDB_API_KEY is not set — movie search and scores are disabled.');
  if (!process.env.ANTHROPIC_API_KEY) console.log('  · ANTHROPIC_API_KEY not set — using IMDb short plots as descriptions.');
  if (!process.env.TMDB_API_KEY) console.log('  · TMDB_API_KEY not set — cast comes from OMDb (often only 3 names).');
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    store.flush();
    process.exit(0);
  });
}
