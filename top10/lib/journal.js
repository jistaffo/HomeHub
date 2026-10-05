// Movie journal: entry validation and the notes-file importer.

export const MAX_NOTE = 2000;

const DATE_RE = /^\d{4}(-\d{2}-\d{2})?$/;

export function validRating(r) {
  if (r === null || r === undefined || r === '') return null;
  const n = Number(r);
  if (!Number.isFinite(n) || n < 0.5 || n > 5 || Math.round(n * 2) !== n * 2) {
    throw Object.assign(new Error('Ratings go from ½ to 5 stars, in half-star steps.'), { status: 400 });
  }
  return n;
}

export function validWatchedOn(d) {
  const s = String(d || '').trim();
  if (!DATE_RE.test(s)) throw Object.assign(new Error('Watched date should look like 2026-10-05 (or just a year).'), { status: 400 });
  const year = Number(s.slice(0, 4));
  if (year < 1900 || year > new Date().getFullYear() + 1) throw Object.assign(new Error('That watched date looks off.'), { status: 400 });
  return s;
}

// Newest first. Year-only (imported) entries sort below dated entries from the
// same year, and among themselves by `seq` (later lines in the notes = later).
export function sortKey(e) {
  return `${e.watchedOn.length === 4 ? `${e.watchedOn}-00-00` : e.watchedOn}|${String(e.seq).padStart(10, '0')}`;
}

// ---------- notes importer ----------

const BULLET = /^\s*(?:[-–—•*·]|\d+[.)])\s*/;
const YEAR_HEADER = /^\s*#*\s*((?:19|20)\d{2})\s*:?\s*$/;
// "Title (2025) - 3.5 - thoughts"   (score and thoughts optional; any dash or colon works as a separator)
const ENTRY = /^(.+?)\s*\(\s*((?:18|19|20)\d{2})\s*\)\s*(?:[-–—:|]\s*)?(.*)$/;
const SCORE = /^(\d(?:\.\d+)?|½)\s*(?:\/\s*(5|10))?\s*(?:stars?|★+)?\s*(?:[-–—:|]\s*|$)/i;

/**
 * Parse a free-form notes file. Returns { entries, skipped } where each entry
 * is { line, title, year, rating, note, watchedYear } and `skipped` lists
 * non-empty lines that weren't understood (other than headings).
 */
export function parseNotes(text, { defaultYear = new Date().getFullYear() } = {}) {
  const entries = [];
  const skipped = [];
  let watchedYear = null;
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');

  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return;
    const header = line.match(YEAR_HEADER);
    if (header) {
      watchedYear = Number(header[1]);
      return;
    }
    const m = line.replace(BULLET, '').match(ENTRY);
    if (!m) {
      skipped.push({ line: i + 1, text: line });
      return;
    }
    const [, title, year, rest] = m;
    let rating = null;
    let note = rest.trim();
    const s = note.match(SCORE);
    if (s) {
      let n = s[1] === '½' ? 0.5 : Number(s[1]);
      if (s[2] === '10') n /= 2;
      if (n >= 0.5 && n <= 5) {
        rating = Math.round(n * 2) / 2;
        note = note.slice(s[0].length).trim();
      }
    }
    entries.push({
      line: i + 1,
      title: title.trim().replace(/[-–—:]+$/, '').trim(),
      year,
      rating,
      note: note.slice(0, MAX_NOTE),
      watchedYear: watchedYear || defaultYear,
    });
  });

  return { entries, skipped };
}
