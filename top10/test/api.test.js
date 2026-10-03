import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startMockOmdb } from './fixtures.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4199;
const base = `http://localhost:${PORT}`;
let omdb, app, dataDir;

before(async () => {
  omdb = await startMockOmdb();
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'top10-'));
  app = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: { ...process.env, PORT: String(PORT), DATA_FILE: path.join(dataDir, 'db.json'), OMDB_API_KEY: 'test', OMDB_BASE_URL: `http://localhost:${omdb.address().port}/`, INVITE_CODE: 'letmein', ANTHROPIC_API_KEY: '', TMDB_API_KEY: '' },
    stdio: 'pipe',
  });
  for (let i = 0; i < 50; i++) {
    try { await fetch(`${base}/api/config`); return; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
  throw new Error('server did not start');
});

after(() => {
  app.kill();
  omdb.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

function client() {
  let cookie = '';
  return async (method, url, body) => {
    const res = await fetch(base + url, {
      method,
      headers: { 'content-type': 'application/json', 'x-top10': '1', cookie },
      body: body && JSON.stringify(body),
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, body: await res.json() };
  };
}

const alice = client();
const bob = client();

test('first user signs up without invite; others need it', async () => {
  let r = await alice('POST', '/api/signup', { username: 'alice', displayName: 'Alice', password: 'password1' });
  assert.equal(r.status, 200);
  r = await bob('POST', '/api/signup', { username: 'bob', password: 'password1', inviteCode: 'wrong' });
  assert.equal(r.status, 403);
  r = await bob('POST', '/api/signup', { username: 'bob', displayName: 'Bob', password: 'password1', inviteCode: 'letmein' });
  assert.equal(r.status, 200);
});

test('mutations without the custom header are rejected', async () => {
  const r = await fetch(`${base}/api/logout`, { method: 'POST' });
  assert.equal(r.status, 403);
});

test('movie details include all three scores and credits', async () => {
  const { status, body: m } = await alice('GET', '/api/movies/tt0111161');
  assert.equal(status, 200);
  assert.deepEqual(m.scores, { imdb: '9.3/10', imdbVotes: null, rottenTomatoes: '89%', metacritic: '82/100' });
  assert.deepEqual(m.director, ['Frank Darabont']);
  assert.equal(m.actors.length, 3);
  assert.equal(m.synopsis, 'Short premise.');
  // Metascore falls back to the top-level field when Ratings lacks it.
  assert.equal((await alice('GET', '/api/movies/tt1375666')).body.scores.metacritic, '74/100');
});

test('search proxies OMDb', async () => {
  const { body } = await alice('GET', '/api/movies/search?q=back');
  assert.equal(body.results[0].imdbID, 'tt0088763');
});

test('lists enforce era, size and uniqueness', async () => {
  let r = await alice('PUT', '/api/mine/1990s', { items: [{ imdbID: 'tt0088763' }] });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /doesn't fit/);
  r = await alice('PUT', '/api/mine/all-time', { items: [{ imdbID: 'tt0111161' }, { imdbID: 'tt0111161' }] });
  assert.equal(r.status, 400);
  r = await alice('PUT', '/api/mine/all-time', { items: Array.from({ length: 11 }, () => ({ imdbID: 'tt0111161' })) });
  assert.equal(r.status, 400);
  r = await alice('PUT', '/api/mine/all-time', { items: [{ imdbID: 'tt0111161', note: 'Hope.' }, { imdbID: 'tt0088763' }] });
  assert.equal(r.status, 200);
  assert.equal(r.body.items[0].note, 'Hope.');
  assert.equal(r.body.items[1].rank, 2);
});

test('friends see each other and compare builds a group ranking', async () => {
  await bob('PUT', '/api/mine/all-time', { items: [{ imdbID: 'tt0088763' }, { imdbID: 'tt1375666' }] });
  const f = await bob('GET', '/api/friends');
  assert.equal(f.body.people.length, 2);
  assert.equal(f.body.recent[0].owner.username, 'alice');
  const c = await alice('GET', '/api/compare/all-time');
  assert.equal(c.body.lists.length, 2);
  assert.equal(c.body.consensus[0].movie.title, 'Back to the Future'); // 9 + 10 points
  assert.equal(c.body.consensus[0].points, 19);
});

test('public share link can be turned on and off', async () => {
  const mine = await alice('GET', '/api/mine/all-time');
  let r = await alice('POST', `/api/lists/${mine.body.id}/share`, { enabled: true });
  const token = r.body.shareToken;
  assert.ok(token);
  const anon = await fetch(`${base}/api/shared/${token}`).then((x) => x.json());
  assert.equal(anon.items.length, 2);
  assert.equal(anon.shareToken, undefined);
  // Bob can't toggle Alice's list.
  assert.equal((await bob('POST', `/api/lists/${mine.body.id}/share`, { enabled: false })).status, 404);
  await alice('POST', `/api/lists/${mine.body.id}/share`, { enabled: false });
  assert.equal((await fetch(`${base}/api/shared/${token}`)).status, 404);
});

test('unauthenticated API access is refused; shared page serves the app', async () => {
  assert.equal((await fetch(`${base}/api/friends`)).status, 401);
  const html = await fetch(`${base}/s/whatever`).then((r) => r.text());
  assert.match(html, /<script type="module" src="\/app.js">/);
  assert.equal((await fetch(`${base}/../server.js`)).status, 200); // normalized to index.html, not the source
  assert.doesNotMatch(await fetch(`${base}/%2e%2e/server.js`).then((r) => r.text()), /createServer/);
});
