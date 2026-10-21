# 14 S. Gay Drive — Home Hub

A shared, installable home-ownership tracker for two people. Static site
(`index.html` + `app.js`), no build step, syncs through a Google Sheet you
own via a small Apps Script backend.

## How it's put together

- `index.html` / `app.js` — the whole app (all 12 tabs, styling, client logic).
- `assets/` — floor plan and system photos go here (currently empty — see
  "What's missing" below).
- `icons/`, `manifest.webmanifest`, `sw.js` — PWA install support and
  offline shell caching.
- `gas/HomeHub_GAS.js` — the Google Apps Script backend. Not served by the
  site; you paste it into your own Google Sheet's Apps Script editor.

## What's missing from this rebuild

This app was rebuilt from a prior session after the original file was lost
to a container recycle before it finished pushing to GitHub. Two things
could not be restored and were deliberately left as blank, user-editable
lists rather than guessed at:

- **Projects tab → Inspection Findings** — the original 41-item list from
  your 78-page inspection report.
- **To-Do Projects** — the original 46-item project list.

Everything else (Dashboard priorities, Insurance detail, the BlueBird
windows/financing writeup, Purchase Record, Closing Tracker history) was
preserved. Floor plan and radon-system photos are also missing — re-add
them as files in `assets/` and reference them from `index.html` if you
have copies elsewhere.

## First-time setup

### 1. Create the shared Google Sheet

1. Create a new Google Sheet (either of you — you'll both connect to it).
2. `Extensions → Apps Script`. Delete the default code and paste in the
   full contents of `gas/HomeHub_GAS.js`.
3. `Project Settings (gear icon) → Script Properties → Add script property`:
   name it `HH_TOKEN`, value = a long random string only you two will know.
   **This is the actual access control** — treat it like a shared password.
4. Save, then `Deploy → New deployment → (gear) Web app`.
   - Execute as: **Me**
   - Who has access: **Anyone** (this only means anyone can *reach* the
     URL — without the correct `HH_TOKEN` every request is rejected before
     it touches your data)
5. Deploy, authorize the script when prompted, and copy the `/exec` URL.

### 2. Connect the app

Open the hosted app, click **⚙ Sheets** in the header, and paste in the Web
App URL and your `HH_TOKEN` value. Do this on both of your devices, using
the same URL and token.

### 3. Fill in sensitive fields (optional, recommended)

Policy numbers, loan numbers, and credit scores are **not** in this app's
source code — they only exist in your Sheet once you enter them. Go to the
**🛡️ Insurance** tab, scroll to **🔒 Sensitive Info**, and fill in the four
fields. They stay masked (••••••) everywhere until clicked.

## Hosting (Cloudflare Pages + Access)

1. **Make the GitHub repo private first** (Settings → General → Danger
   Zone → Change visibility → Private).
2. In Cloudflare: Pages → Create a project → Connect to Git, pick this
   repo. No build command needed — static site, output directory `/`.
3. Every push to the connected branch auto-deploys.
4. Cloudflare Zero Trust → Access → Applications → Add an application →
   Self-hosted. Point it at your Pages domain, add a policy allowing
   exactly your two email addresses.
5. Visit the Pages URL on each device, log in via Access once, then
   install it: iOS Safari → Share → Add to Home Screen; Android Chrome →
   ⋮ menu → Install app.

## How sync works

- Every 60 seconds, each open device polls the Sheet for changes.
- If you're actively typing or a field is focused, the app buffers what it
  fetched instead of applying it immediately, applying once you're idle
  (or after 7 minutes at the latest).
- Records (repair log, contractors, warranties, utility months,
  closing-tracker entries, findings, to-dos) are merged **by record**, not
  as an all-or-nothing overwrite.
- Conflicts resolve by last-write-wins, using each record's own timestamp.
- Each new/edited record is tagged with who made it (`— Ian, 2d ago`) —
  set once per device via the "Who's this?" prompt in the header.
- **Known limitation:** deleting a record and adding a different new one in
  the same sync window can, rarely, cause the deleted record to reappear.
  Just delete it again if that happens.

## Data storage in the Sheet

- One tab per record type — **logs**, **contractors**, **warranties**,
  **utils**, **ct**, **findings**, **todos** — one row per entry.
- A single **`_AppState`** tab holds calendar task completions and your
  sensitive fields as opaque JSON.

## Backup

Google Sheets keeps automatic version history
(`File → Version history → See version history`). For a point-in-time
backup, `File → Download → Microsoft Excel` any time.

## Adding a third user later

1. Add their email to the Cloudflare Access policy.
2. Add their name to the `HH_USERS` array near the top of `app.js`.
3. Have them connect via **⚙ Sheets** with the same URL and `HH_TOKEN`.

## Rotating the access token

Change the `HH_TOKEN` Script Property value, redeploy (**Deploy → Manage
deployments → Edit → New version**), and reconnect both devices via
**⚙ Sheets** with the new value.

## Local development

Serve the folder with any static file server (`python3 -m http.server`) —
no build step, no dependencies beyond two Google Fonts loaded via CDN.
