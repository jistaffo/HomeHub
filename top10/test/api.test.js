import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startMockOmdb, startMockTmdb } from './fixtures.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4199;
const base = `http://localhost:${PORT}`;
let omdb, tmdb, app, dataDir;

before(async () => {
  omdb = await startMockOmdb();
  tmdb = await startMockTmdb();
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'top10-'));
  app = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(PORT),
      DATA_FILE: path.join(dataDir, 'db.json'),
      OMDB_API_KEY: 'test',
      OMDB_BASE_URL: `http://localhost:${omdb.address().port}/`,
      TMDB_API_KEY: 'test',
      TMDB_BASE_URL: `http://localhost:${tmdb.address().port}/3`,
      ANTHROPIC_API_KEY: '',
      INVITE_CODE: '',
    },
    stdio: 'pipe',
  });
  for (let i = 0; i < 50; i++) {
    try {
      await fetch(`${base}/api/config`);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error('server did not start');
});

after(() => {
  app.kill();
  omdb.close();
  tmdb.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

function client() {
  let cookie = '';
  const call = async (method, url, body) => {
    const res = await fetch(base + url, {
      method,
      headers: { 'content-type': 'application/json', 'x-top10': '1', cookie },
      body: body && JSON.stringify(body),
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, body: await res.json() };
  };
  call.cookie = () => cookie;
  return call;
}

const alice = client();
const bob = client();
const bobPhone = client();
let invite;

test('first user becomes owner; others need the invite code', async () => {
  let r = await alice('POST', '/api/signup', { username: 'alice', displayName: 'Alice', password: 'password1' });
  assert.equal(r.status, 200);
  assert.equal(r.body.user.isOwner, true);
  invite = (await alice('GET', '/api/friends')).body.inviteCode;
  r = await bob('POST', '/api/signup', { username: 'bob', password: 'password1', inviteCode: 'wrong' });
  assert.equal(r.status, 403);
  r = await bob('POST', '/api/signup', { username: 'bob', displayName: 'Bob', password: 'password1', inviteCode: invite });
  assert.equal(r.status, 200);
  assert.equal(r.body.user.isOwner, false);
  assert.equal((await bobPhone('POST', '/api/login', { username: 'bob', password: 'password1' })).status, 200);
});

test('mutations without the custom header are rejected', async () => {
  assert.equal((await fetch(`${base}/api/logout`, { method: 'POST' })).status, 403);
});

test('details merge OMDb scores with TMDB cast and poster', async () => {
  const { status, body: m } = await alice('GET', '/api/movies/tt0111161');
  assert.equal(status, 200);
  assert.deepEqual(m.scores, { imdb: '9.3/10', imdbVotes: null, rottenTomatoes: '89%', metacritic: '82/100' });
  assert.deepEqual(m.director, ['Frank Darabont']);
  assert.deepEqual(m.actors, ['Tim Robbins', 'Morgan Freeman', 'Bob Gunton', 'William Sadler']); // TMDB billing order, top 4
  assert.equal(m.poster, 'https://image.tmdb.org/t/p/w342/shawshank.jpg');
  assert.equal(m.tmdbId, 278);
  assert.equal(m.synopsis, 'Short premise.'); // IMDb short plot preferred over TMDB overview
});

test('search goes through TMDB and supports a trailing year', async () => {
  let { body } = await alice('GET', '/api/movies/search?q=back');
  assert.equal(body.results[0].id, 'tmdb:105');
  assert.equal(body.results[0].year, '1985');
  assert.equal(body.results[0].poster, 'https://image.tmdb.org/t/p/w154/bttf.jpg');
  // Already-cached movies come back with their IMDb id.
  ({ body } = await alice('GET', '/api/movies/search?q=shawshank'));
  assert.equal(body.results[0].id, 'tt0111161');
  ({ body } = await alice('GET', '/api/movies/search?q=back%202020'));
  assert.equal(body.results.length, 0);
  ({ body } = await alice('GET', '/api/movies/search?q=back%20(1985)'));
  assert.equal(body.results.length, 1);
});

test('TMDB ids resolve to IMDb ids; movies not on IMDb are refused clearly', async () => {
  const r = await alice('GET', '/api/movies/tmdb:105');
  assert.equal(r.body.imdbID, 'tt0088763');
  assert.equal(r.body.scores.rottenTomatoes, '93%');
  const missing = await alice('GET', '/api/movies/tmdb:1000');
  assert.equal(missing.status, 404);
  assert.match(missing.body.error, /isn’t listed on IMDb/);
  assert.equal((await alice('GET', '/api/movies/nonsense')).status, 400);
});

test('lists enforce era, size and uniqueness', async () => {
  let r = await alice('PUT', '/api/mine/1990s', { items: [{ imdbID: 'tt0088763' }] });
  assert.equal(r.status, 400);
  assert.match(r.body.error, /doesn't fit/);
  r = await alice('PUT', '/api/mine/all-time', { items: [{ imdbID: 'tt0111161' }, { imdbID: 'tmdb:278' }] });
  assert.equal(r.status, 400, 'same movie by two kinds of id is still a duplicate');
  r = await alice('PUT', '/api/mine/all-time', { items: Array.from({ length: 11 }, () => ({ imdbID: 'tt0111161' })) });
  assert.equal(r.status, 400);
  r = await alice('PUT', '/api/mine/all-time', { items: [{ imdbID: 'tt0111161', note: 'Hope.' }, { imdbID: 'tt0088763' }] });
  assert.equal(r.status, 200);
  assert.equal(r.body.items[0].note, 'Hope.');
  assert.equal(r.body.items[1].rank, 2);
});

test('friends see each other and compare builds a group ranking', async () => {
  await bob('PUT', '/api/mine/all-time', { items: [{ imdbID: 'tt0088763' }] });
  const f = await bob('GET', '/api/friends');
  assert.equal(f.body.people.length, 2);
  assert.equal(f.body.viewerIsOwner, false);
  assert.equal(f.body.recent[0].owner.username, 'alice');
  const c = await alice('GET', '/api/compare/all-time');
  assert.equal(c.body.lists.length, 2);
  assert.equal(c.body.consensus[0].movie.title, 'Back to the Future'); // 9 + 10 points
  assert.equal(c.body.consensus[0].points, 19);
});

test('public share link can be turned on and off; clearing a list deletes it', async () => {
  const mine = await alice('GET', '/api/mine/all-time');
  const token = (await alice('POST', `/api/lists/${mine.body.id}/share`, { enabled: true })).body.shareToken;
  assert.ok(token);
  const anon = await fetch(`${base}/api/shared/${token}`).then((x) => x.json());
  assert.equal(anon.items.length, 2);
  assert.equal(anon.shareToken, undefined);
  assert.equal((await bob('POST', `/api/lists/${mine.body.id}/share`, { enabled: false })).status, 404);
  await alice('POST', `/api/lists/${mine.body.id}/share`, { enabled: false });
  assert.equal((await fetch(`${base}/api/shared/${token}`)).status, 404);

  await alice('PUT', '/api/mine/1980s', { items: [{ imdbID: 'tt0088763' }] });
  const cleared = await alice('PUT', '/api/mine/1980s', { items: [] });
  assert.equal(cleared.body.id, null);
  assert.ok(!(await alice('GET', '/api/my-lists')).body.lists.some((l) => l.category === '1980s'));
});

test('display name and password changes', async () => {
  let r = await bob('PATCH', '/api/me', { displayName: '  Robert ' });
  assert.equal(r.body.user.displayName, 'Robert');
  assert.equal((await bob('PATCH', '/api/me', { displayName: '' })).status, 400);
  assert.equal((await bob('POST', '/api/me/password', { current: 'nope', next: 'password2' })).status, 400);
  assert.equal((await bob('POST', '/api/me/password', { current: 'password1', next: 'short' })).status, 400);
  r = await bob('POST', '/api/me/password', { current: 'password1', next: 'password2' });
  assert.equal(r.status, 200);
  // This session survives, the other device is signed out.
  assert.equal((await bob('GET', '/api/friends')).status, 200);
  assert.equal((await bobPhone('GET', '/api/friends')).status, 401);
});

test('owner can issue a one-time reset link', async () => {
  assert.equal((await bob('POST', `/api/users/x/reset-link`)).status, 403);
  const people = (await alice('GET', '/api/friends')).body.people;
  const bobId = people.find((p) => p.username === 'bob').id;
  const { body } = await alice('POST', `/api/users/${bobId}/reset-link`);
  const token = body.path.split('/').pop();
  const stranger = client();
  assert.equal((await stranger('GET', `/api/reset/${token}`)).body.username, 'bob');
  assert.equal((await stranger('POST', `/api/reset/${token}`, { password: 'x' })).status, 400);
  const r = await stranger('POST', `/api/reset/${token}`, { password: 'password3' });
  assert.equal(r.status, 200);
  assert.equal(r.body.user.username, 'bob');
  assert.equal((await stranger('POST', `/api/reset/${token}`, { password: 'password4' })).status, 404, 'link is single-use');
  assert.equal((await bob('GET', '/api/friends')).status, 401, 'old sessions are revoked');
  assert.equal((await bob('POST', '/api/login', { username: 'bob', password: 'password3' })).status, 200);
});

test('owner can rotate the invite and remove members', async () => {
  assert.equal((await bob('POST', '/api/invite/rotate')).status, 403);
  const { body } = await alice('POST', '/api/invite/rotate');
  assert.notEqual(body.inviteCode, invite);
  const carol = client();
  assert.equal((await carol('POST', '/api/signup', { username: 'carol', password: 'password1', inviteCode: invite })).status, 403);
  assert.equal((await carol('POST', '/api/signup', { username: 'carol', password: 'password1', inviteCode: body.inviteCode })).status, 200);

  const people = (await alice('GET', '/api/friends')).body.people;
  const bobId = people.find((p) => p.username === 'bob').id;
  assert.equal((await bob('DELETE', `/api/users/${bobId}`)).status, 403);
  assert.equal((await alice('DELETE', `/api/users/${people.find((p) => p.isMe).id}`)).status, 400);
  assert.equal((await alice('DELETE', `/api/users/${bobId}`)).status, 200);
  assert.equal((await bob('GET', '/api/friends')).status, 401);
  assert.equal((await alice('GET', '/api/compare/all-time')).body.lists.length, 1, "bob's lists are gone");
});

test('failed logins are throttled per username, successful ones never are', async () => {
  for (let i = 0; i < 12; i++) assert.equal((await alice('POST', '/api/login', { username: 'alice', password: 'password1' })).status, 200);
  const eve = client();
  for (let i = 0; i < 10; i++) await eve('POST', '/api/login', { username: 'carol', password: 'guess' });
  assert.equal((await eve('POST', '/api/login', { username: 'carol', password: 'password1' })).status, 429);
  assert.equal((await alice('POST', '/api/login', { username: 'alice', password: 'password1' })).status, 200);
});

test('hostile URLs do not crash the server or leak files', async () => {
  assert.equal((await fetch(`${base}/%E0%A4%A`)).status, 400);
  assert.equal((await fetch(`${base}/api/lists/%E0%A4%A`)).status, 400);
  assert.doesNotMatch(await fetch(`${base}/%2e%2e/server.js`).then((r) => r.text()), /createServer/);
  assert.equal((await fetch(`${base}/api/friends`)).status, 401);
  const html = await fetch(`${base}/s/whatever`).then((r) => r.text());
  assert.match(html, /<script type="module" src="\/app.js">/);
});

test('daily backup snapshot is written', () => {
  const files = fs.readdirSync(path.join(dataDir, 'backups'));
  assert.equal(files.length, 1);
  assert.match(files[0], /^db-\d{4}-\d{2}-\d{2}\.json$/);
});

// ---------- journal ----------

const dan = client();
const erin = client();

test('journal: log, edit, privacy and recently watched', async () => {
  const invite = (await alice('GET', '/api/friends')).body.inviteCode;
  assert.equal((await dan('POST', '/api/signup', { username: 'dan', password: 'password1', inviteCode: invite })).status, 200);
  assert.equal((await erin('POST', '/api/signup', { username: 'erin', password: 'password1', inviteCode: invite })).status, 200);

  // Validation
  assert.equal((await dan('POST', '/api/journal', { movieId: 'tt0111161', rating: 4.3, watchedOn: '2026-10-01' })).status, 400);
  assert.equal((await dan('POST', '/api/journal', { movieId: 'tt0111161', rating: 6, watchedOn: '2026-10-01' })).status, 400);
  assert.equal((await dan('POST', '/api/journal', { movieId: 'tt0111161', watchedOn: 'yesterday' })).status, 400);
  assert.equal((await dan('POST', '/api/journal', { watchedOn: '2026-10-01' })).status, 400);

  let r = await dan('POST', '/api/journal', { movieId: 'tmdb:105', rating: 4.5, note: 'Secret thoughts', watchedOn: '2026-10-01' });
  assert.equal(r.status, 200);
  assert.equal(r.body.movie.title, 'Back to the Future');
  const id = r.body.id;
  await dan('POST', '/api/journal', { movieId: 'tt0111161', rating: 5, watchedOn: '2026-10-03', hidden: true, note: 'guilty pleasure' });
  await dan('POST', '/api/journal', { title: 'Some Short Film', year: '2019', watchedOn: '2026-09-20' });

  const mine = (await dan('GET', '/api/journal')).body.entries;
  assert.deepEqual(mine.map((e) => e.movie.title), ['The Shawshank Redemption', 'Back to the Future', 'Some Short Film']);
  assert.equal(mine[1].note, 'Secret thoughts');

  // Friends: no notes, no hidden entries
  const recent = (await erin('GET', '/api/recent')).body.entries;
  assert.deepEqual(recent.map((e) => e.movie.title), ['Back to the Future', 'Some Short Film']);
  assert.ok(recent.every((e) => !('note' in e)));
  assert.ok(!JSON.stringify(recent).includes('Secret thoughts'));
  assert.equal(recent[0].rating, 4.5);
  assert.equal(recent[0].user.username, 'dan');
  assert.equal((await dan('GET', '/api/recent')).body.entries.length, 0, "your own entries aren't in your feed");
  const danCard = (await erin('GET', '/api/friends')).body.people.find((p) => p.username === 'dan');
  assert.deepEqual(danCard.watched.map((w) => w.title), ['Back to the Future', 'Some Short Film']);
  assert.ok(!JSON.stringify((await erin('GET', '/api/friends')).body).includes('Secret thoughts'));

  // Others can't see or touch your entries
  assert.equal((await erin('GET', '/api/journal')).body.entries.length, 0);
  assert.equal((await erin('PATCH', `/api/journal/${id}`, { rating: 1 })).status, 404);
  assert.equal((await erin('DELETE', `/api/journal/${id}`)).status, 404);

  // Edit keeps unspecified fields
  r = await dan('PATCH', `/api/journal/${id}`, { rating: 3, hidden: true });
  assert.equal(r.body.rating, 3);
  assert.equal(r.body.note, 'Secret thoughts');
  assert.equal(r.body.watchedOn, '2026-10-01');
  assert.equal((await erin('GET', '/api/recent')).body.entries.length, 1);
  assert.equal((await dan('DELETE', `/api/journal/${id}`)).status, 200);
  assert.equal((await dan('GET', '/api/journal')).body.entries.length, 2);
});

test('journal: import a notes file (preview, then save; never in the feed)', async () => {
  const text = [
    'Movie Journal',
    '2025',
    ' – The Shawshank Redemption (1994) - 4.5 - Hope is a good thing',
    ' – Back to the Future (1984) - 4 - off by a year in my notes',
    ' – Nonexistent Film (2020) - 3 - hmm',
    '2026',
    ' – Indie Darling (2021) - 9/10 - lovely',
  ].join('\n');
  const { body: preview } = await erin('POST', '/api/journal/import/preview', { text });
  assert.equal(preview.entries.length, 4);
  assert.deepEqual(preview.skipped.map((s) => s.text), ['Movie Journal']);
  assert.equal(preview.entries[0].match.title, 'The Shawshank Redemption');
  assert.equal(preview.entries[1].match.year, '1985', 'off-by-one year still matches');
  assert.equal(preview.entries[2].match, null);
  assert.equal(preview.entries[3].rating, 4.5);
  assert.equal(preview.entries[3].watchedYear, 2026);

  const entries = preview.entries.map((e) => ({ ...e, movieId: e.match?.id || null }));
  let r = await erin('POST', '/api/journal/import', { entries });
  assert.deepEqual(r.body, { imported: 4, duplicates: 0 });
  r = await erin('POST', '/api/journal/import', { entries });
  assert.deepEqual(r.body, { imported: 0, duplicates: 4 }, 're-importing is safe');

  const journal = (await erin('GET', '/api/journal')).body.entries;
  // 2026 first; within 2025, later lines are more recent.
  assert.deepEqual(journal.map((e) => e.movie.title), ['Indie Darling', 'Nonexistent Film', 'Back to the Future', 'The Shawshank Redemption']);
  assert.equal(journal[2].note, 'off by a year in my notes');
  assert.equal(journal[1].movie.imdbID, null);
  assert.ok(journal.every((e) => e.watchedOn.length === 4));
  assert.ok(!(await alice('GET', '/api/recent')).body.entries.some((e) => e.user.username === 'erin'), 'imported history stays out of the feed');

  // "newest at top" reverses the order within a year
  const ann = client();
  const invite = (await alice('GET', '/api/friends')).body.inviteCode;
  await ann('POST', '/api/signup', { username: 'ann', password: 'password1', inviteCode: invite });
  await ann('POST', '/api/journal/import', { entries: entries.slice(0, 2), newestAt: 'top' });
  assert.deepEqual((await ann('GET', '/api/journal')).body.entries.map((e) => e.movie.title), ['The Shawshank Redemption', 'Back to the Future']);
});

test('journal: removing a member removes their journal', async () => {
  const people = (await alice('GET', '/api/friends')).body.people;
  await alice('DELETE', `/api/users/${people.find((p) => p.username === 'dan').id}`);
  assert.ok(!(await erin('GET', '/api/recent')).body.entries.some((e) => e.user.username === 'dan'));
});
