# Top 10

A small web app for a group of friends (built for ~6 people) to rank and share
their Top 10 movies:

- **All Time**, **20th Century** (1900–1999), **21st Century** (2000+), and
  the **1980s, 1990s, 2000s, 2010s, 2020s**. Each person gets one list per
  category. Decade and century lists only accept movies released in that
  range.
- Every movie is a **tile** showing rank, poster, year, director, writer, the
  top 4 billed actors, and **IMDb / Rotten Tomatoes / Metacritic** scores.
  Tap a tile to expand it: you get a **spoiler-free description**, genre,
  runtime, rating, the owner's "why it's on my list" note, and an IMDb link.
- **Sharing:** everyone in the group sees everyone's lists automatically
  (Home shows the latest updates; Friends lists each person). **Compare** puts
  the whole group side by side for one category and builds a points-based
  group ranking. Any list can also get a **public read-only link** for people
  outside the group.
- Add movies by searching. Reorder by dragging (desktop) or with the ▲▼
  arrows (phone). Changes save automatically.

## Quick start

Requires Node.js 20+.

```bash
cd top10
npm install
OMDB_API_KEY=your_key npm start
# → http://localhost:4100
```

The first person to sign up starts the group. Everyone after that needs the
invite link from the **Friends** page (it fills in the invite code for them).

## API keys

| Variable | Required | What it does |
|---|---|---|
| `OMDB_API_KEY` | **Yes** | Movie search, details, and all three scores. Get a free key at [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx) (1,000 requests/day, plenty for a small group since results are cached). |
| `ANTHROPIC_API_KEY` | Recommended | Rewrites IMDb's full plot summary into a 2–3 sentence **spoiler-free** premise using Claude (`claude-opus-5-5` at low effort, with server-side refusal fallback enabled). It runs once per movie and the result is cached. Without it, the app uses IMDb's one-line short plot, which is usually spoiler-light but isn't guaranteed. |
| `TMDB_API_KEY` | Optional | OMDb usually lists only **3** actors. With a free [TMDB](https://www.themoviedb.org/settings/api) key (v3 key or v4 read token), the tile shows the top **4** billed cast members. |

### Why OMDb, not the sites directly?

IMDb, Rotten Tomatoes, and Metacritic have no free public APIs, and scraping
them breaks their terms of service (and breaks whenever their pages change).
OMDb is the standard workaround: one call returns IMDb's rating and plot
(sourced from IMDb) plus the Rotten Tomatoes Tomatometer and Metascore. One
caveat: OMDb sometimes has no Rotten Tomatoes score, especially for newer
films. The tile shows "—" when a score isn't available.

Scores are cached and refreshed weekly. Generated descriptions are kept
permanently.

## Other settings

| Variable | Default | |
|---|---|---|
| `PORT` | `4100` | |
| `DATA_FILE` | `top10/data/top10.json` | All users, lists, and the movie cache. Back it up by copying this file. |
| `INVITE_CODE` | random, generated once | Set this to pick your own invite code. |
| `MAX_USERS` | `10` | Sign-ups are refused once the group reaches this size. |
| `COOKIE_SECURE` | auto | Set to `1` to force `Secure` cookies (detected automatically behind an HTTPS proxy via `X-Forwarded-Proto`). |

## Putting it online for your friends

Your friends need a URL they can reach. Any of these work:

- **A small always-on host** (Render, Railway, Fly.io, a VPS): run
  `npm install && npm start` with the env vars above, and attach a
  **persistent disk** pointed at by `DATA_FILE`. Without one, lists are lost
  on every redeploy.
- **Your own computer plus a tunnel** (e.g. Cloudflare Tunnel or Tailscale
  Funnel) for something quick. It's only reachable while your computer is on.

Use HTTPS when exposing it to the internet. All of the hosts and tunnels
above provide it.

## Security notes

- Passwords are hashed with scrypt. Sessions are random tokens in an
  HttpOnly, SameSite=Lax cookie and are stored hashed on the server.
- State-changing requests must carry a custom header, which blocks
  cross-site form posts. Login and sign-up attempts are rate-limited.
- Within the group, everyone can see all lists by design. Public share links
  are off by default, can be turned on per list, and turning one off
  invalidates the link.

## Development

```bash
npm run dev   # restarts on file changes
npm test      # API + movie-service tests against a mock OMDb (no network needed)
```

```
server.js            HTTP server, auth, list/compare/share routes, static files
lib/movies.js        OMDb / TMDB / Claude integration + caching
lib/categories.js    list categories and year rules
lib/store.js         JSON-file persistence (atomic writes)
public/              the client: index.html, app.js, styles.css (no build step)
test/                node:test suites + mock OMDb fixture
```
