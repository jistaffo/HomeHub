# DWLLNG

A web app for building an accurate virtual recreation of your house, then
redesigning any room — furniture, wall colors, flooring — while the real
architecture (walls, doors, windows, dimensions) stays intact underneath.

## What it does today

- **Houses & floors.** Create a house, add one or more floors.
- **2D floor plan editor.** Draw rooms as polygons with real-world
  dimensions (feet). Drag corners to reshape, or type an exact wall
  length in the side panel. Add doors and windows to any wall.
- **Blueprint tracing.** Upload a photo or scanned blueprint as a
  reference image on a floor, calibrate it to real-world scale (click two
  points of known distance), and trace over it while drawing rooms.
- **3D viewer.** See the whole floor (or a single room) extruded into 3D
  from your 2D plan — walls, floor, door/window openings.
- **Room design mode.** Pick any room and:
  - Drag furniture from a built-in catalog into a top-down 2D layout;
    resize, rotate, recolor, or remove pieces. Changes show live in a 3D
    preview.
  - Repaint walls and change floor color.
  - Save multiple named design versions per room and switch between them
    (e.g. "Original", "Option B") without losing the others.
- **Autosave.** Everything persists to a small local database as you work.

## What's intentionally not built yet

- **Camera/AR room scanning.** Getting your house into DWLLNG today is
  manual (draw it, optionally tracing over an uploaded blueprint/photo).
  Automatic phone-camera or LiDAR scanning was left out of this first
  version on purpose — browser AR support (especially on iPhone) is too
  inconsistent to build reliably as a v1 feature, and it's really a
  separate project (native app + AR APIs) on top of everything here. It's
  a natural phase 2 once the core editor is proven out.
- **True native mobile app.** This is a responsive web app that works on
  phones and tablets in the browser (and can be "installed" from the
  browser's share/menu), not a separate iOS/Android app.
- **Photorealistic materials/textures** — colors only, no texture swatches.
- **Real geometric holes for doors/windows** — they're drawn as a clearly
  marked, correctly-sized panel on the wall rather than an actual cut-out.
  Visually approximate, still accurate for planning purposes.
- **Multi-user accounts / sharing** — single-user by design for now.

## Architecture

Small monorepo, two workspaces:

- `client/` — React + TypeScript + Vite. Zustand for state, Konva
  (`react-konva`) for the 2D floor plan and furniture editors, Three.js
  (`@react-three/fiber` + drei) for the 3D views, Tailwind for styling.
- `server/` — Express + `better-sqlite3`. Each house is stored as one JSON
  document (its floors/rooms/walls/openings/design versions/furniture),
  keyed by id. This keeps the backend intentionally simple — it's a thin
  persistence layer; all the editing logic lives in the client.

Data model (see `client/src/types.ts`): a `House` has `Floor`s, each
`Floor` has `Room`s (polygons in feet), each `Room` has `Edge`s (one per
wall, holding door/window `Opening`s) and a list of `DesignVersion`s (each
its own furniture layout + wall/floor colors).

## Running it locally

Requires Node.js 18+.

```bash
npm install       # installs both client and server workspaces
npm run dev       # starts the API on :4000 and the web app on :5173
```

Open http://localhost:5173. The dev server proxies `/api` requests to the
Express server automatically.

To build for production and run it as one server:

```bash
npm run build     # builds the client into client/dist
npm start         # serves the API + built client on :4000
```

The database file is created automatically at `server/dwllng.db` on first
run.

## Project layout

```
client/src/
  types.ts               data model
  store.ts                Zustand store + autosave
  api.ts                  fetch wrapper for the backend
  geometry.ts              polygon/edge math helpers
  furnitureCatalog.ts       built-in furniture library
  pages/
    Dashboard.tsx           house list / create / delete
    HouseEditor.tsx         2D/3D floor plan editing
    RoomDesign.tsx          furniture + materials + design versions
  components/
    FloorPlanCanvas.tsx      2D room/wall/opening editor (Konva)
    FurniturePlanCanvas.tsx  2D top-down furniture placement (Konva)
    House3DView.tsx          whole-floor 3D viewer (R3F)
    Room3DView.tsx           single-room 3D viewer (R3F)
    three/SceneRoom.tsx       shared wall/floor/furniture 3D geometry
    RoomPropertiesPanel.tsx  wall/opening editing panel
    RoomDesignPanel.tsx      design version + materials panel
    BlueprintControls.tsx    blueprint upload/calibration UI
server/src/
  db.js     SQLite setup
  index.js  Express routes (houses CRUD) + static file serving
```
