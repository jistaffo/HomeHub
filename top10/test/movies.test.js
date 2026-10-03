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
