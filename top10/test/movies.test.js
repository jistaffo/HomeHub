import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { startMockOmdb } from './fixtures.js';

test('spoiler-free rewrite uses Claude with the full plot, and is cached across refreshes', async () => {
  const omdb = await startMockOmdb();
  const seen = [];
  const claude = http.createServer(async (req, res) => {
    let raw = '';
    for await (const c of req) raw += c;
    seen.push({ url: req.url, beta: req.headers['anthropic-beta'], body: JSON.parse(raw) });
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ id: 'msg_1', type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [{ type: 'text', text: 'A banker arrives at prison.' }], stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } }));
  });
  await new Promise((r) => claude.listen(0, r));
  process.env.OMDB_BASE_URL = `http://localhost:${omdb.address().port}/`;
  process.env.ANTHROPIC_BASE_URL = `http://localhost:${claude.address().port}`;
  const { MovieService } = await import(`../lib/movies.js?${Date.now()}`);

  const store = { data: { movies: {} }, save() {} };
  const svc = new MovieService(store, { omdbKey: 'test', anthropicKey: 'sk-test' });
  const m = await svc.get('tt0111161');
  assert.equal(m.synopsis, 'A banker arrives at prison.');
  assert.equal(m.synopsisSource, 'claude');
  assert.equal(seen.length, 1);
  assert.equal(seen[0].body.model, 'claude-opus-5-5');
  assert.match(seen[0].body.messages[0].content, /Full plot with the ending/);
  assert.match(seen[0].beta, /server-side-fallback-2026-07-01/);

  // A stale entry re-pulls scores but keeps the generated description.
  store.data.movies.tt0111161.fetchedAt = 0;
  await svc.get('tt0111161');
  assert.equal(seen.length, 1);
  assert.equal(store.data.movies.tt0111161.synopsisSource, 'claude');

  omdb.close();
  claude.close();
});

async function service(keys) {
  const { startMockTmdb } = await import('./fixtures.js');
  const tmdb = await startMockTmdb();
  const omdb = await startMockOmdb();
  process.env.TMDB_BASE_URL = `http://localhost:${tmdb.address().port}/3`;
  process.env.OMDB_BASE_URL = `http://localhost:${omdb.address().port}/`;
  const { MovieService } = await import(`../lib/movies.js?${Math.random()}`);
  const store = { data: { movies: {} }, save() {} };
  return { svc: new MovieService(store, keys), store, close: () => (tmdb.close(), omdb.close()) };
}

test('TMDB alone is enough to run (no scores), using the overview as description', async () => {
  const { svc, close } = await service({ tmdbKey: 'test' });
  const results = await svc.search('indie');
  assert.equal(results[0].id, 'tmdb:999');
  const m = await svc.get('tmdb:999');
  assert.equal(m.imdbID, 'tt9999999');
  assert.equal(m.title, 'Indie Darling');
  assert.equal(m.year, '2021');
  assert.deepEqual(m.director, ['Some Director']);
  assert.deepEqual(m.actors, ['A One', 'B Two', 'C Three', 'D Four']);
  assert.equal(m.runtime, '95 min');
  assert.deepEqual(m.scores, {});
  assert.equal(m.synopsisSource, 'tmdb');
  close();
});

test('TMDB writer credits keep the role for source material', async () => {
  const { svc, close } = await service({ tmdbKey: 'test' });
  const m = await svc.get('tt0111161');
  assert.deepEqual(m.writer, ['Frank Darabont', 'Stephen King (novel)']);
  close();
});

test('TMDB v4 read-access tokens are sent as a bearer header', async () => {
  const { svc, close } = await service({ tmdbKey: 'x'.repeat(60) });
  assert.equal((await svc.search('back'))[0].tmdbId, 105);
  close();
});

test('OMDb-only still works, and a failed refresh keeps serving the cached copy', async () => {
  const { svc, store, close } = await service({ omdbKey: 'test' });
  const results = await svc.search('back');
  assert.equal(results[0].id, 'tt0088763');
  const m = await svc.get('tt0088763');
  assert.equal(m.scores.imdb, '8.5/10');
  close();
  store.data.movies.tt0088763.fetchedAt = 0; // stale, and the upstream is now down
  const again = await svc.get('tt0088763');
  assert.equal(again.title, 'Back to the Future');
});
