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

Requires Node.js 20.12+.

```bash
cd top10
npm install
cp .env.example .env     # then paste your keys into .env
npm start                # → http://localhost:4100
```

The first person to sign up becomes the **group owner**. Everyone after that
needs the invite link from the **Friends** page (it fills in the invite code
for them).

## Movie data (free API keys)

Both data sources are free. Put the keys in `top10/.env`, or set them as
environment variables on your host.

| Variable | What it powers | Get a key |
|---|---|---|
| `TMDB_API_KEY` | Search (ranked by popularity; add a year to narrow it, e.g. "heat 1995"), posters, the **top 4 billed** actors, director and writer credits, genres, runtime | [themoviedb.org](https://www.themoviedb.org/signup) → Settings → API. Either the "API Key" or the "API Read Access Token" works. |
| `OMDB_API_KEY` | **IMDb**, **Rotten Tomatoes** and **Metacritic** scores, MPAA rating, IMDb plot summaries | [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx), FREE tier. Click the activation link in the email or the key won't work. |
| `ANTHROPIC_API_KEY` *(optional)* | **Spoiler-free descriptions**: Claude (`claude-opus-5-5`, low effort, server-side refusal fallback on) rewrites the full plot into a 2–3 sentence premise. Runs once per movie, then cached. | [console.anthropic.com](https://console.anthropic.com/) |

**Use both TMDB and OMDb.** Either one alone works:

- **TMDB only:** everything works except the three scores, which show "—".
- **OMDb only:** search is weaker, posters are lower quality, and the cast is usually only 3 names.

With both keys set, TMDB handles search, which keeps you well inside OMDb's
1,000 requests/day free limit. Movie details are cached and the scores are
re-fetched weekly.

**Descriptions without Claude:** the app uses IMDb's one-line plot (via OMDb),
falling back to TMDB's overview. Both are usually spoiler-light but not
guaranteed.

### Why not pull from IMDb / Rotten Tomatoes / Metacritic directly?

None of them offer a free public API, and scraping them breaks their terms
of service (and breaks whenever their pages change). OMDb is the standard
workaround and returns all three scores in one call. OMDb sometimes lacks a
Rotten Tomatoes score, especially for newer films; the tile then shows "—".

TMDB's terms require crediting them, which the footer on every page does.

## Running the group

- **Invite:** Friends → Invite a friend → Share. The owner can make a new
  invite link if the old one got passed around (the old one stops working).
- **Forgotten password:** the owner opens Friends, taps ⋯ next to the
  person, and chooses *Create reset link*. The link works once, expires in 24
  hours, and signs that person out everywhere.
- **Owner locked out?** Stop the server, then run
  `npm run reset-link -- <username> https://your-site-url`. Open the link it
  prints, then start the server again.
- **Remove someone:** Friends → ⋯ → Remove. This deletes their account and lists.
- Anyone can change their display name or password from the avatar menu
  (top right). Changing your password signs out your other devices.

## Other settings

| Variable | Default | |
|---|---|---|
| `PORT` | `4100` | |
| `DATA_FILE` | `top10/data/top10.json` | Everything: users, lists, movie cache. A dated copy goes to `backups/` next to it once a day (last 14 kept). |
| `INVITE_CODE` | random, generated once | Set this to pick your own invite code (the in-app "new invite link" button is then disabled). |
| `MAX_USERS` | `10` | Sign-ups are refused once the group reaches this size. |
| `COOKIE_SECURE` | auto | Set to `1` to force `Secure` cookies (detected automatically behind an HTTPS proxy via `X-Forwarded-Proto`). |

## Putting it online for your friends

Your friends need a URL they can reach, and the data file must live on
storage that survives restarts.

- **Render (easiest):** `render.yaml` (at the repository root) is ready to use. On Render, choose
  New → Blueprint, pick this repo, and paste your keys when asked. It uses
  the Starter plan with a 1 GB persistent disk; the free plan has no disk, so
  lists would be wiped on every deploy. Render gives you an HTTPS URL.
- **Docker anywhere** (Fly.io, Railway, a home server):
  `docker build -t top10 top10 && docker run -p 4100:4100 -v top10-data:/data --env-file top10/.env top10`.
  Keep the `/data` volume.
- **Your own computer plus a tunnel** (Cloudflare Tunnel, Tailscale Funnel):
  quick, but only up while your computer is on.

## Security notes

- Passwords are hashed with scrypt. Sessions and reset links are random
  tokens stored only as hashes; sessions live in HttpOnly, SameSite=Lax
  cookies.
- State-changing requests must carry a custom header, which blocks
  cross-site form posts. Failed logins and invite codes are rate-limited
  (only failures count, so a group sharing one network never locks itself
  out). Pages are served with a strict Content-Security-Policy.
- Within the group, everyone can see all lists by design. Public share links
  are off by default, can be turned on per list, and turning one off (or
  clearing the list) invalidates the link.
- The group owner can create reset links for anyone, so pick someone you trust.

## Development

```bash
npm run dev   # restarts on file changes
npm test      # API + movie-service tests against mock OMDb, TMDB and Claude (no network or keys needed)
```

```
server.js            HTTP server, accounts, list/compare/share routes, static files
lib/movies.js        TMDB + OMDb (+ Claude) integration, merging and caching
lib/auth.js          password hashing, tokens, reset links
lib/store.js         JSON-file persistence (atomic writes, daily backups)
scripts/reset-link.js  command-line password reset for a locked-out owner
lib/categories.js    list categories and year rules
public/              the client: index.html, app.js, styles.css (no build step)
test/                node:test suites + mock OMDb / TMDB fixtures
```
