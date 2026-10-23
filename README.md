# 14 S. Gay Drive — Home Hub

A shared, installable home-ownership tracker for two people. Static site
(`index.html` + `app.js`), no build step, syncs through a Google Sheet you
own via a small Apps Script backend.

## How it's put together

- `index.html` / `app.js` — the whole app: Dashboard, Appliances & Systems,
  Calendar, Projects, Directory, House Records, Repair Log.
- `assets/` — floor plan and system photos go here (currently empty — see
  "What's missing" below).
- `icons/`, `manifest.webmanifest`, `sw.js` — PWA install support and
  offline shell caching.
- `gas/HomeHub_GAS.js` — the Google Apps Script backend, including the
  monthly Gmail utility-bill import. Not served by the site; you paste it
  into your own Google Sheet's Apps Script editor.

## Hosting — current status

**Nothing is deployed yet.** This repo is still public on GitHub, and
neither GitHub Pages nor Cloudflare Pages has been turned on. An earlier
note mentioned GitHub Pages as an example of "some simple host" — that was
never set up, and it isn't recommended here: GitHub Pages can't gate
access on a free account, so a deployed site would be reachable by anyone
with the URL. **Cloudflare Pages + Cloudflare Access** (below) is the
actual recommendation and the only hosting path this README documents.

## Sections

The app is organized around what you'd actually reach for, not the raw
data categories:

| Section | Holds |
| --- | --- |
| **Dashboard** | Alerts, what's due this month, utility spend, quick links — the home screen |
| **Appliances & Systems** | One card per item: model/serial, age vs. expected life, manual link, warranty, linked contractor, its maintenance tasks and repair history |
| **Calendar** | Every recurring maintenance task, generated from each appliance plus general house tasks |
| **Projects** | To-Do / Completed (dated history) / Inspection Findings |
| **Directory** | Every contractor and utility provider, each linked to the items they service |
| **House Records** | Archive: Insurance, Closing Tracker, Purchase Record, ADU planning, sensitive-info editor |
| **Repair Log** | Full chronological log; entries also surface on their linked appliance's card |

On mobile, Dashboard / Appliances / Calendar / Projects are the primary
drawer items; Directory / House Records / Repair Log sit under "More" —
still one tap away.

## What's missing from this rebuild

Two previous rebuilds lost source content that hasn't been found since.
Rather than invent plausible-sounding content about your actual house,
these are left as blank, user-editable lists:

- **Projects → Inspection Findings** — the original 41-item list from your
  78-page inspection report.
- **Floor plan and radon-system install photos** — add them as files in
  `assets/` and reference them from the Dashboard / House Records once you
  have copies.

Everything else — Dashboard alerts, Insurance detail, the BlueBird
windows/financing writeup, Purchase Record, Closing Tracker history, the
full appliance/contractor data from the October 2026 brief — is populated.

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
6. In the same Apps Script editor, select `setupUtilityImportTrigger` from
   the function dropdown and click **Run** once. This will prompt you to
   authorize Gmail access — approve it. This installs a monthly trigger
   that scans for City of Longmont and Xcel Energy bill emails and fills
   in the Utilities section automatically; it also runs once immediately.

### 2. Connect the app

Open the hosted app, click **⚙ Sheets** in the header, and paste in the Web
App URL and your `HH_TOKEN` value. Do this on both of your devices, using
the same URL and token.

### 3. Fill in sensitive fields (optional, recommended)

Policy numbers, loan numbers, and credit scores are **not** in this app's
source code — they only exist in your Sheet once you enter them. Go to
**House Records → 🔒 Sensitive Info** and fill in the four fields. They
stay masked (••••••) everywhere until clicked.

## Hosting setup (Cloudflare Pages + Access)

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
- Records (repair log, contractors, appliances, utility months,
  closing-tracker entries, findings, projects) are merged **by record**,
  not as an all-or-nothing overwrite.
- Conflicts resolve by last-write-wins, using each record's own timestamp.
- Each new/edited record is tagged with who made it (`— Ian, 2d ago`) —
  set once per device via the "Who's this?" prompt in the header.
  Auto-imported utility rows are tagged `Auto-imported` instead.
- **Known limitation:** deleting a record and adding a different new one in
  the same sync window can, rarely, cause the deleted record to reappear.
  Just delete it again if that happens.

## Automatic utility import

`gas/HomeHub_GAS.js` includes `importUtilityBillsFromGmail()`, installed
as a monthly trigger via `setupUtilityImportTrigger()` (step 6 above). On
each run it:

- Searches Gmail for recent messages from City of Longmont billing and
  Xcel Energy.
- Pulls the payment/due amount and billing month out of the email body.
- Writes or updates that month's row in the `utils` sheet — City of
  Longmont under combined electric+water, Xcel under gas.
- Tags the row `importedBy` (`longmont` / `xcel`) so imported rows are
  visually distinct (⚡) from manual entries, and skips any month+source
  it's already imported, so re-running never duplicates a row.
- Stores **only the dollar amount and month** — never an account number.

This needs Gmail read access, which Apps Script can only grant through an
interactive authorization — that's why `setupUtilityImportTrigger()` has
to be run manually once from the Apps Script editor rather than purely
through deployment.

## Data storage in the Sheet

- One tab per record type — **logs**, **contractors**, **appliances**,
  **utils**, **ct**, **findings**, **projects** — one row per entry.
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
