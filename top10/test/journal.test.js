import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNotes, validRating, sortKey } from '../lib/journal.js';

test('parses the common notes formats', () => {
  const { entries, skipped } = parseNotes(
    [
      'Movie Journal',
      '',
      '2026',
      ' – Avatar: Fire & Ash (2025) - 3.5 - Visually stunning, with some world building - and dashes.',
      ' – Project Hail Mary (2026) -3.5 - The book is better',
      ' – The AI Doc: How I Became An Apocoloptimist (2026) - 4.5 - A fantastic documentary',
      '## 2025:',
      '- Sinners (2025) – 9/10 – wow',
      '* Heretic (2024): 4/5: great',
      '3. Weapons (2025)',
      '- Nosferatu (2024) - loved the atmosphere',
      '- Something without a year',
    ].join('\n'),
  );
  assert.deepEqual(
    entries.map((e) => [e.watchedYear, e.title, e.year, e.rating, e.note]),
    [
      [2026, 'Avatar: Fire & Ash', '2025', 3.5, 'Visually stunning, with some world building - and dashes.'],
      [2026, 'Project Hail Mary', '2026', 3.5, 'The book is better'],
      [2026, 'The AI Doc: How I Became An Apocoloptimist', '2026', 4.5, 'A fantastic documentary'],
      [2025, 'Sinners', '2025', 4.5, 'wow'],
      [2025, 'Heretic', '2024', 4, 'great'],
      [2025, 'Weapons', '2025', null, ''],
      [2025, 'Nosferatu', '2024', null, 'loved the atmosphere'],
    ],
  );
  assert.deepEqual(skipped.map((s) => s.text), ['Movie Journal', '- Something without a year']);
});

test('entries before any year heading use the default year', () => {
  assert.equal(parseNotes('Heat (1995) - 5', { defaultYear: 2024 }).entries[0].watchedYear, 2024);
});

test('ratings are half-star steps from ½ to 5', () => {
  assert.equal(validRating(null), null);
  assert.equal(validRating('3.5'), 3.5);
  assert.throws(() => validRating(0));
  assert.throws(() => validRating(3.3));
  assert.throws(() => validRating(5.5));
});

test('dated entries sort above year-only entries from the same year', () => {
  const a = sortKey({ watchedOn: '2026-01-02', seq: 1 });
  const b = sortKey({ watchedOn: '2026', seq: 99 });
  const c = sortKey({ watchedOn: '2025-12-31', seq: 100 });
  assert.deepEqual([b, c, a].sort().reverse(), [a, b, c]);
});
