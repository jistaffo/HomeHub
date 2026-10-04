// Movie data comes from two free APIs, each doing what it's best at:
//
//   TMDB  search (popularity-ranked), posters, top-billed cast, director and
//         writer credits, genres, runtime, overview.
//   OMDb  IMDb rating, Rotten Tomatoes, Metacritic, MPAA rating, and IMDb's
//         plot summaries.
//
// Either key alone is enough to run; with both, TMDB handles search (which
// also keeps you well inside OMDb's 1,000 requests/day free tier) and the two
// are merged per movie. Movies are keyed by IMDb id everywhere.
//
// Optionally, Claude rewrites the full plot into a spoiler-free description.

const OMDB_BASE = process.env.OMDB_BASE_URL || 'https://www.omdbapi.com/';
const TMDB_BASE = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
const TMDB_IMG = 'https://image.tmdb.org/t/p';
const REFRESH_MS = 7 * 24 * 60 * 60 * 1000; // re-pull scores weekly

const IMDB_ID = /^tt\d{5,10}$/;
const TMDB_ID = /^tmdb:(\d{1,10})$/;

export class MovieService {
  constructor(store, { omdbKey, tmdbKey, anthropicKey } = {}) {
    this.store = store;
    this.omdbKey = omdbKey;
    this.tmdbKey = tmdbKey;
    this.anthropicKey = anthropicKey;
    this.inflight = new Map();
    this.claude = null;
  }

  get configured() {
    return Boolean(this.omdbKey || this.tmdbKey);
  }

  get sources() {
    return { omdb: Boolean(this.omdbKey), tmdb: Boolean(this.tmdbKey), claude: Boolean(this.anthropicKey) };
  }

  // ---------- upstream clients ----------

  async omdb(params) {
    const url = new URL(OMDB_BASE);
    url.search = new URLSearchParams({ apikey: this.omdbKey, ...params }).toString();
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (res.status === 401) throw httpError(502, 'OMDb rejected the API key (check OMDB_API_KEY, and that it was activated from the email).');
    if (!res.ok) throw httpError(502, `OMDb returned ${res.status}`);
    return res.json();
  }

  // Accepts either a v3 API key or a v4 "API Read Access Token".
  async tmdb(pathname, params = {}) {
    const url = new URL(TMDB_BASE + pathname);
    const bearer = this.tmdbKey.length > 40;
    url.search = new URLSearchParams({ ...params, ...(bearer ? {} : { api_key: this.tmdbKey }) }).toString();
    const res = await fetch(url, {
      headers: { accept: 'application/json', ...(bearer ? { Authorization: `Bearer ${this.tmdbKey}` } : {}) },
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 401) throw httpError(502, 'TMDB rejected the API key (check TMDB_API_KEY).');
    if (res.status === 404) return null;
    if (!res.ok) throw httpError(502, `TMDB returned ${res.status}`);
    return res.json();
  }

  // ---------- search ----------

  // A trailing year narrows results: "heat 1995", "dune (2021)".
  async search(query) {
    let q = String(query || '').trim();
    if (q.length < 2) return [];
    if (!this.configured) throw httpError(503, 'Movie lookups are not configured. Set TMDB_API_KEY and/or OMDB_API_KEY on the server.');
    const m = q.match(/^(.+?)\s*\(?((?:19|20)\d{2})\)?$/);
    const year = m ? m[2] : null;
    if (m) q = m[1];

    if (this.tmdbKey) {
      const data = await this.tmdb('/search/movie', { query: q, include_adult: 'false', ...(year ? { primary_release_year: year } : {}) });
      const known = this.tmdbIndex();
      return (data?.results || []).slice(0, 10).map((r) => ({
        id: known.get(r.id) || `tmdb:${r.id}`,
        imdbID: known.get(r.id) || null,
        tmdbId: r.id,
        title: r.title,
        year: (r.release_date || '').slice(0, 4),
        poster: r.poster_path ? `${TMDB_IMG}/w154${r.poster_path}` : null,
      }));
    }

    const data = await this.omdb({ s: q, type: 'movie', ...(year ? { y: year } : {}) });
    if (data.Response === 'False') return [];
    return (data.Search || []).slice(0, 10).map((r) => ({
      id: r.imdbID,
      imdbID: r.imdbID,
      tmdbId: null,
      title: r.Title,
      year: r.Year,
      poster: clean(r.Poster),
    }));
  }

  tmdbIndex() {
    const map = new Map();
    for (const m of Object.values(this.store.data.movies)) if (m.tmdbId) map.set(m.tmdbId, m.imdbID);
    return map;
  }

  // ---------- details ----------

  // `id` is an IMDb id ("tt0111161") or a TMDB search result id ("tmdb:278").
  // Cached; stale entries are refreshed, and if the refresh fails we keep
  // serving the stale copy so a flaky upstream never breaks a list.
  async get(id) {
    const imdbID = await this.resolve(id);
    const cached = this.store.data.movies[imdbID];
    if (cached && Date.now() - cached.fetchedAt < REFRESH_MS) return cached;
    if (this.inflight.has(imdbID)) return this.inflight.get(imdbID);
    const p = this.fetchMovie(imdbID, cached)
      .catch((err) => {
        if (cached) return cached;
        throw err;
      })
      .finally(() => this.inflight.delete(imdbID));
    this.inflight.set(imdbID, p);
    return p;
  }

  async resolve(id) {
    id = String(id || '');
    if (IMDB_ID.test(id)) return id;
    const m = id.match(TMDB_ID);
    if (!m) throw httpError(400, 'Invalid movie id');
    const tmdbId = Number(m[1]);
    const known = this.tmdbIndex().get(tmdbId);
    if (known) return known;
    if (!this.tmdbKey) throw httpError(400, 'Invalid movie id');
    const ids = await this.tmdb(`/movie/${tmdbId}/external_ids`);
    if (!ids) throw httpError(404, 'Movie not found');
    if (!ids.imdb_id) throw httpError(404, 'That movie isn’t listed on IMDb yet, so it can’t be added.');
    return ids.imdb_id;
  }

  // Cache-only read, used when rendering lists so a page load never fans out
  // into dozens of upstream calls.
  peek(imdbID) {
    return this.store.data.movies[imdbID] || null;
  }

  async fetchMovie(imdbID, previous) {
    if (!this.configured) throw httpError(503, 'Movie lookups are not configured.');
    const keepSynopsis = previous?.synopsisSource === 'claude' && previous.synopsis;
    // The full plot is only needed as input for the spoiler-free rewrite.
    const needFull = this.omdbKey && this.anthropicKey && !keepSynopsis;

    const settle = (p) => p.catch((err) => (console.warn(`[movies] ${imdbID}: ${err.message}`), { error: err }));
    const [short, full, tmdb] = await Promise.all([
      this.omdbKey ? settle(this.omdb({ i: imdbID, plot: 'short' })) : null,
      needFull ? settle(this.omdb({ i: imdbID, plot: 'full' })) : null,
      this.tmdbKey ? settle(this.tmdbDetails(imdbID, previous?.tmdbId)) : null,
    ]);

    const omdbOk = short && !short.error && short.Response !== 'False';
    const tmdbOk = tmdb && !tmdb.error;
    if (!omdbOk && !tmdbOk) {
      const upstream = short?.error || tmdb?.error;
      if (upstream) throw upstream;
      throw httpError(404, short?.Error || 'Movie not found');
    }

    const movie = mergeMovie(omdbOk ? normalizeOmdb(short) : null, tmdbOk ? tmdb : null, imdbID);
    movie.fetchedAt = Date.now();

    if (keepSynopsis) {
      movie.synopsis = previous.synopsis;
      movie.synopsisSource = 'claude';
    } else {
      const source = clean(full?.Plot) || (tmdbOk ? tmdb.overview : null);
      const rewritten = await this.spoilerFree(movie, source).catch((err) => {
        console.warn(`[movies] spoiler-free rewrite failed for ${imdbID}: ${err.message}`);
        return null;
      });
      const shortPlot = omdbOk ? clean(short.Plot) : null;
      if (rewritten) [movie.synopsis, movie.synopsisSource] = [rewritten, 'claude'];
      else if (shortPlot) [movie.synopsis, movie.synopsisSource] = [shortPlot, 'imdb-short'];
      else if (tmdbOk && tmdb.overview) [movie.synopsis, movie.synopsisSource] = [tmdb.overview, 'tmdb'];
      else [movie.synopsis, movie.synopsisSource] = ['', null];
    }

    this.store.data.movies[imdbID] = movie;
    this.store.save();
    return movie;
  }

  async tmdbDetails(imdbID, knownTmdbId) {
    let tmdbId = knownTmdbId;
    if (!tmdbId) {
      const found = await this.tmdb(`/find/${imdbID}`, { external_source: 'imdb_id' });
      tmdbId = found?.movie_results?.[0]?.id;
      if (!tmdbId) throw httpError(404, 'Not on TMDB');
    }
    const d = await this.tmdb(`/movie/${tmdbId}`, { append_to_response: 'credits' });
    if (!d) throw httpError(404, 'Not on TMDB');
    return normalizeTmdb(d);
  }

  // IMDb's full plot summaries frequently give away the ending. When an
  // Anthropic key is configured, rewrite it into a premise-only teaser.
  async spoilerFree(movie, plot) {
    if (!this.anthropicKey || !plot) return null;
    if (!this.claude) {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      this.claude = new Anthropic({ apiKey: this.anthropicKey });
    }
    const response = await this.claude.beta.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 2000,
      output_config: { effort: 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system:
        'You write short, spoiler-free movie descriptions for a site where friends share Top 10 lists. ' +
        'Describe only the premise: who the main characters are, the setting, and the situation that kicks off the story. ' +
        'Never reveal twists, deaths, who wins, how it ends, or anything from the second half of the film. ' +
        'Write 2–3 sentences, under 70 words, in present tense. Output only the description, no preamble or quotes.',
      messages: [
        {
          role: 'user',
          content: `Movie: ${movie.title} (${movie.year})\nPlot summary (may contain spoilers):\n${plot}`,
        },
      ],
    });
    if (response.stop_reason === 'refusal') return null;
    const text = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();
    return text || null;
  }
}

// ---------- normalizers ----------

function clean(v) {
  return v && v !== 'N/A' ? String(v).trim() : null;
}

function list(v) {
  const c = clean(v);
  return c ? c.split(',').map((s) => s.trim()).filter(Boolean) : [];
}

export function normalizeOmdb(o) {
  const rating = (source) => clean((o.Ratings || []).find((r) => r.Source === source)?.Value);
  const imdb = rating('Internet Movie Database') || (clean(o.imdbRating) ? `${o.imdbRating}/10` : null);
  const metacritic = rating('Metacritic') || (clean(o.Metascore) ? `${o.Metascore}/100` : null);
  return {
    imdbID: o.imdbID,
    title: o.Title,
    year: o.Year,
    rated: clean(o.Rated),
    runtime: clean(o.Runtime),
    genre: list(o.Genre),
    director: list(o.Director),
    // OMDb writer credits look like "Stephen King (short story), Frank Darabont (screenplay)".
    writer: list(o.Writer),
    actors: list(o.Actors).slice(0, 4),
    poster: clean(o.Poster),
    scores: {
      imdb,
      imdbVotes: clean(o.imdbVotes),
      rottenTomatoes: rating('Rotten Tomatoes'),
      metacritic,
    },
  };
}

const PLAIN_WRITING_JOBS = new Set(['Screenplay', 'Writer', 'Screenplay By']);

export function normalizeTmdb(d) {
  const crew = d.credits?.crew || [];
  const uniq = (arr) => [...new Set(arr)];
  const writers = [];
  const seen = new Set();
  for (const c of crew.filter((c) => c.department === 'Writing')) {
    if (seen.has(c.name)) continue;
    seen.add(c.name);
    writers.push(PLAIN_WRITING_JOBS.has(c.job) ? c.name : `${c.name} (${c.job.toLowerCase()})`);
  }
  return {
    tmdbId: d.id,
    title: d.title,
    year: (d.release_date || '').slice(0, 4) || null,
    runtime: d.runtime ? `${d.runtime} min` : null,
    genre: (d.genres || []).map((g) => g.name),
    director: uniq(crew.filter((c) => c.job === 'Director').map((c) => c.name)),
    writer: writers.slice(0, 4),
    actors: [...(d.credits?.cast || [])].sort((a, b) => a.order - b.order).slice(0, 4).map((c) => c.name),
    poster: d.poster_path ? `${TMDB_IMG}/w342${d.poster_path}` : null,
    overview: clean(d.overview),
  };
}

// OMDb wins for anything IMDb-sourced (title, year, credits as IMDb lists
// them, scores, MPAA rating). TMDB wins for posters and billing order of the
// cast, and fills any gaps.
export function mergeMovie(o, t, imdbID) {
  const pick = (a, b) => (Array.isArray(a) ? (a.length ? a : b || []) : a || b || null);
  return {
    imdbID,
    tmdbId: t?.tmdbId || null,
    title: pick(o?.title, t?.title),
    year: pick(o?.year, t?.year),
    rated: o?.rated || null,
    runtime: pick(o?.runtime, t?.runtime),
    genre: pick(o?.genre, t?.genre),
    director: pick(o?.director, t?.director),
    writer: pick(o?.writer, t?.writer),
    actors: t?.actors?.length >= (o?.actors?.length || 0) ? t.actors : o?.actors || [],
    poster: pick(t?.poster, o?.poster),
    scores: o?.scores || {},
  };
}

export function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}
