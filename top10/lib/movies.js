// Movie data: OMDb for details + IMDb / Rotten Tomatoes / Metacritic scores,
// optional TMDB for full billing order (OMDb usually lists only 3 actors),
// optional Claude for rewriting IMDb's plot into a spoiler-free description.

const OMDB_BASE = process.env.OMDB_BASE_URL || 'https://www.omdbapi.com/';
const TMDB_BASE = process.env.TMDB_BASE_URL || 'https://api.themoviedb.org/3';
const REFRESH_MS = 7 * 24 * 60 * 60 * 1000; // re-pull scores weekly

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
    return Boolean(this.omdbKey);
  }

  async omdb(params) {
    if (!this.omdbKey) throw httpError(503, 'Movie lookups are not configured. Set OMDB_API_KEY on the server.');
    const url = new URL(OMDB_BASE);
    url.search = new URLSearchParams({ apikey: this.omdbKey, ...params }).toString();
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw httpError(502, `OMDb returned ${res.status}`);
    return res.json();
  }

  async search(query) {
    const q = String(query || '').trim();
    if (q.length < 2) return [];
    const data = await this.omdb({ s: q, type: 'movie' });
    if (data.Response === 'False') return [];
    return (data.Search || []).slice(0, 10).map((m) => ({
      imdbID: m.imdbID,
      title: m.Title,
      year: m.Year,
      poster: m.Poster && m.Poster !== 'N/A' ? m.Poster : null,
    }));
  }

  // Cached details. Stale entries are refreshed; if the refresh fails we keep
  // serving the stale copy so a flaky upstream never breaks a list.
  async get(imdbID) {
    if (!/^tt\d{5,10}$/.test(imdbID)) throw httpError(400, 'Invalid IMDb id');
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

  // Cache-only read, used when rendering lists so a page load never fans out
  // into dozens of upstream calls.
  peek(imdbID) {
    return this.store.data.movies[imdbID] || null;
  }

  async fetchMovie(imdbID, previous) {
    // The full plot is only needed as input for the spoiler-free rewrite.
    const needFull = this.anthropicKey && previous?.synopsisSource !== 'claude';
    const [short, full] = await Promise.all([
      this.omdb({ i: imdbID, plot: 'short' }),
      needFull ? this.omdb({ i: imdbID, plot: 'full' }) : null,
    ]);
    if (short.Response === 'False') throw httpError(404, short.Error || 'Movie not found');

    const movie = normalizeOmdb(short);
    movie.fetchedAt = Date.now();

    const cast = await this.tmdbCast(imdbID).catch(() => null);
    if (cast && cast.length) movie.actors = cast.slice(0, 4);

    // Keep a previously generated description; plots don't change, scores do.
    if (previous?.synopsisSource === 'claude' && previous.synopsis) {
      movie.synopsis = previous.synopsis;
      movie.synopsisSource = 'claude';
    } else {
      const fullPlot = clean(full?.Plot);
      const rewritten = await this.spoilerFree(movie, fullPlot).catch((err) => {
        console.warn(`[movies] spoiler-free rewrite failed for ${imdbID}: ${err.message}`);
        return null;
      });
      movie.synopsis = rewritten || clean(short.Plot) || '';
      movie.synopsisSource = rewritten ? 'claude' : 'imdb-short';
    }

    this.store.data.movies[imdbID] = movie;
    this.store.save();
    return movie;
  }

  async tmdbCast(imdbID) {
    if (!this.tmdbKey) return null;
    const headers = { accept: 'application/json' };
    const auth = this.tmdbKey.length > 40 ? { Authorization: `Bearer ${this.tmdbKey}` } : null;
    const withKey = (u) => (auth ? u : `${u}${u.includes('?') ? '&' : '?'}api_key=${this.tmdbKey}`);
    const opts = { headers: { ...headers, ...auth }, signal: AbortSignal.timeout(8000) };

    const found = await fetch(withKey(`${TMDB_BASE}/find/${imdbID}?external_source=imdb_id`), opts).then((r) => r.json());
    const tmdbId = found?.movie_results?.[0]?.id;
    if (!tmdbId) return null;
    const credits = await fetch(withKey(`${TMDB_BASE}/movie/${tmdbId}/credits`), opts).then((r) => r.json());
    return (credits.cast || [])
      .sort((a, b) => a.order - b.order)
      .map((c) => c.name)
      .filter(Boolean);
  }

  // IMDb's full plot summaries frequently give away the ending. When an
  // Anthropic key is configured, rewrite it into a premise-only teaser.
  async spoilerFree(movie, fullPlot) {
    if (!this.anthropicKey || !fullPlot) return null;
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
          content: `Movie: ${movie.title} (${movie.year})\nIMDb plot summary (may contain spoilers):\n${fullPlot}`,
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

export function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}
