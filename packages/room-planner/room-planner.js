/**
 * <room-planner> — a framework-agnostic, dependency-free custom element
 * for laying out rooms as draggable/resizable rectangles on a 1-sq-ft grid.
 *
 * Drop it in with a plain <script type="module"> tag — no build step,
 * no bundler required. It also imports cleanly into a bundled app
 * (Vite/webpack/etc.) since it's a standard ES module.
 *
 * USAGE (see demo.html for a full working example)
 * --------------------------------------------------
 *   <room-planner id="planner"></room-planner>
 *   <script type="module">
 *     import "./room-planner.js";
 *     const planner = document.getElementById("planner");
 *
 *     // Hydrate from your own storage (optional — falls back to a small
 *     // generic example layout if you never set this):
 *     planner.initialState = savedRoomsFromYourBackend;
 *
 *     // Persistence is entirely on you — this component holds no
 *     // storage or network code of its own. Listen for "change" and
 *     // save however DWLLNG saves things:
 *     planner.addEventListener("change", (e) => {
 *       saveToYourBackend(e.detail.state);
 *     });
 *
 *     // Push external updates back in at any time (e.g. after a fetch):
 *     planner.setState(freshStateFromServer);
 *     const current = planner.getState();
 *   </script>
 *
 * PUBLIC API
 * ----------
 *   Properties:
 *     .initialState   Array<Piece> | undefined — starter layout, read once
 *                      at first connect (or whenever set before connect).
 *     .referenceNotes Array<{value:string,label:string}> — optional
 *                      cheat-sheet list shown in the sidebar (e.g. real
 *                      tape measurements). Omit/empty to hide the panel.
 *     .notes          string (HTML-escaped) — optional freeform facts
 *                      block shown in the sidebar. Omit to hide.
 *     .types          object — optional override/extension of the room
 *                      type catalog (see DEFAULT_TYPES below for shape).
 *
 *   Attributes (read once at connect, mirror the properties above for
 *   pure-HTML usage with no JS beyond the import):
 *     initial-state="[...]"   JSON-encoded array of pieces
 *     heading="..."           overrides the default H1 text
 *     subheading="..."        overrides the default instructional copy
 *
 *   Methods:
 *     getState() -> Array<Piece>   current layout (deep-ish copy)
 *     setState(arr)                replace the layout programmatically;
 *                                   does NOT emit "change" (it's an
 *                                   inbound hydration, not a user edit)
 *
 *   Events:
 *     "change"  CustomEvent<{state: Array<Piece>}> — fired after every
 *               COMMITTED edit (drag released, resize released, a piece
 *               added/deleted/renamed/resized-by-typing). Never fired
 *               on every pointer-move — already debounced to one event
 *               per user gesture.
 *
 *   Piece shape: { id, type, label, x, y, w, h }  — x/y/w/h in feet.
 *
 * THEMING
 * -------
 * All colors are CSS custom properties on the host element, with light
 * defaults and a prefers-color-scheme dark variant baked in. Override
 * any of them from your own stylesheet:
 *
 *   room-planner { --rp-accent: #7C3AED; --rp-paper: #fff; }
 *
 * See the --rp-* variables declared under :host below for the full list.
 */

const DEFAULT_TYPES = {
  living:   { label: "Living Room",        tag: false, w: 14,  h: 14, group: "common" },
  kitchen:  { label: "Kitchen / Dining",   tag: false, w: 12,  h: 11, group: "common" },
  dining:   { label: "Dining Room",        tag: false, w: 12,  h: 11, group: "common" },
  office:   { label: "Office",             tag: false, w: 10,  h: 10, group: "common" },
  sunroom:  { label: "Sunroom",            tag: false, w: 10,  h: 10, group: "common" },
  hallway:  { label: "Hallway",            tag: false, w: 4,   h: 10, group: "circulation" },
  stairs:   { label: "Stairs",             tag: false, w: 4,   h: 8,  group: "circulation" },
  utility:  { label: "Utility",            tag: false, w: 5,   h: 6,  group: "circulation" },
  laundry:  { label: "Laundry Room",       tag: false, w: 6,   h: 6,  group: "circulation" },
  mudroom:  { label: "Mudroom",            tag: false, w: 6,   h: 6,  group: "circulation" },
  garage:   { label: "Garage",             tag: false, w: 20,  h: 20, group: "circulation" },
  closet:   { label: "Closet",             tag: false, w: 3,   h: 4,  group: "circulation" },
  bedroom:  { label: "Bedroom",            tag: false, w: 11,  h: 12, group: "bed" },
  bathroom: { label: "Bathroom",           tag: false, w: 6,   h: 8,  group: "wet" },
  door:     { label: "Door",               tag: true,  w: 1.5, h: 1.5 },
  window:   { label: "Window",             tag: true,  w: 1.5, h: 1.5 },
  exterior: { label: "Exterior Feature",   tag: true,  w: 1.5, h: 1.5 } // patio / deck / garage marker, etc.
};

const GENERIC_STATE = [
  { id: "p1", type: "living",   label: "Living Room", x: 0.5, y: 0.5, w: 14, h: 14 },
  { id: "p2", type: "bedroom",  label: "Bedroom",      x: 16,  y: 0.5, w: 11, h: 12 },
  { id: "p3", type: "bathroom", label: "Bathroom",     x: 0.5, y: 15,  w: 6,  h: 8  },
  { id: "p4", type: "hallway",  label: "Hallway",      x: 8,   y: 15,  w: 4,  h: 10 },
  { id: "p5", type: "door",     label: "Door",         x: 0.5, y: 24,  w: 1.5, h: 1.5 },
  { id: "p6", type: "window",   label: "Window",       x: 3,   y: 24,  w: 1.5, h: 1.5 }
];

const STYLE = `
  :host{
    --rp-paper:#EDEFE9; --rp-panel:#E1E4D9; --rp-panel-2:#D6DACB;
    --rp-ink:#1E2B26; --rp-ink-soft:#4E5A52; --rp-ink-faint:#7C8579;
    --rp-accent:#C97A1A; --rp-accent-ink:#5C3B0E; --rp-accent-soft:#F0DCB8;
    --rp-border:#C9CDBF; --rp-danger:#B0402E;
    --rp-common:#3F6B54; --rp-common-bg:#DDE8DF;
    --rp-wet:#3B5B77; --rp-wet-bg:#DCE6ED;
    --rp-bed:#B06A17; --rp-bed-bg:#F0DCB8;
    --rp-circ:#6B6456; --rp-circ-bg:#E6E2D6;
    display:block; font-family:ui-sans-serif,system-ui,"Segoe UI",Roboto,sans-serif;
    color:var(--rp-ink); background:var(--rp-paper);
  }
  @media (prefers-color-scheme: dark){
    :host(:not([data-theme="light"])){
      --rp-paper:#161C19; --rp-panel:#1E2621; --rp-panel-2:#242D27;
      --rp-ink:#E8EBE3; --rp-ink-soft:#AEB8AC; --rp-ink-faint:#7D877D;
      --rp-accent:#E3A34C; --rp-accent-ink:#2A1E0B; --rp-accent-soft:#3A2E17;
      --rp-border:#333B34;
      --rp-common:#8FC7AA; --rp-common-bg:#1E2B24;
      --rp-wet:#8FB2CE; --rp-wet-bg:#1E2B33;
      --rp-bed:#E3A34C; --rp-bed-bg:#3A2E17;
      --rp-circ:#A9A290; --rp-circ-bg:#252821;
    }
  }
  :host([data-theme="dark"]){
    --rp-paper:#161C19; --rp-panel:#1E2621; --rp-panel-2:#242D27;
    --rp-ink:#E8EBE3; --rp-ink-soft:#AEB8AC; --rp-ink-faint:#7D877D;
    --rp-accent:#E3A34C; --rp-accent-ink:#2A1E0B; --rp-accent-soft:#3A2E17;
    --rp-border:#333B34;
    --rp-common:#8FC7AA; --rp-common-bg:#1E2B24;
    --rp-wet:#8FB2CE; --rp-wet-bg:#1E2B33;
    --rp-bed:#E3A34C; --rp-bed-bg:#3A2E17;
    --rp-circ:#A9A290; --rp-circ-bg:#252821;
  }
  *{box-sizing:border-box;}
  .wrap{padding:16px;}
  h1{font-size:19px; font-weight:700; margin:0 0 6px; line-height:1.2;}
  .sub{font-size:13px; color:var(--rp-ink-soft); line-height:1.5; margin:0 0 14px; max-width:70ch;}
  .toolbar{display:flex; flex-wrap:wrap; align-items:center; gap:8px; background:var(--rp-panel); border:1px solid var(--rp-border); padding:9px 10px; margin-bottom:12px;}
  select, button{font:inherit; font-size:12.5px; font-weight:600; padding:6px 10px; border-radius:4px; border:1px solid var(--rp-border); background:var(--rp-paper); color:var(--rp-ink); cursor:pointer;}
  button.danger-arm{background:var(--rp-danger); color:#fff; border-color:var(--rp-danger);}
  .spacer{flex:1;}
  .metric{font-family:ui-monospace,"SF Mono",Menlo,monospace; font-size:11.5px; color:var(--rp-ink-soft);}
  .metric b{color:var(--rp-ink);}
  .layout{display:grid; grid-template-columns:minmax(0,1fr) 230px; gap:14px; align-items:start;}
  .canvas-scroll{background:var(--rp-panel); border:1px solid var(--rp-border); overflow:auto; max-height:70vh; padding:12px;}
  .ruler-grid{display:grid; grid-template-columns:24px auto; grid-template-rows:16px auto;}
  .ruler-corner{grid-column:1; grid-row:1; background:var(--rp-panel);}
  .ruler-top{grid-column:2; grid-row:1; position:relative; height:16px; background:var(--rp-panel);}
  .ruler-left{grid-column:1; grid-row:2; position:relative; width:24px; background:var(--rp-panel);}
  .ruler-top span,.ruler-left span{position:absolute; font-family:ui-monospace,monospace; font-size:8.5px; color:var(--rp-ink-faint);}
  .ruler-top span{top:2px; transform:translateX(-50%);}
  .ruler-left span{left:0; right:3px; text-align:right;}
  .canvas{grid-column:2; grid-row:2; position:relative; border:1px solid var(--rp-border);
    background-color:var(--rp-paper);
    background-image:
      linear-gradient(to right, var(--rp-panel-2) 1px, transparent 1px),
      linear-gradient(to bottom, var(--rp-panel-2) 1px, transparent 1px),
      linear-gradient(to right, var(--rp-border) 1.5px, transparent 1.5px),
      linear-gradient(to bottom, var(--rp-border) 1.5px, transparent 1.5px);
    background-size:16px 16px,16px 16px,80px 80px,80px 80px;
  }
  .piece{position:absolute; box-sizing:border-box; border:2px solid var(--rp-ink-soft); border-radius:3px; cursor:grab; touch-action:none; user-select:none;}
  .piece:active{cursor:grabbing;}
  .piece.selected{box-shadow:0 0 0 2px var(--rp-accent);}
  /* Text is clipped by this inner wrapper, not by .piece itself — .piece
     must stay overflow:visible so the resize handles and delete button,
     which are deliberately positioned outside its box, aren't cut off. */
  .piece .content{position:absolute; inset:0; display:flex; flex-direction:column; padding:5px 7px; overflow:hidden;}
  .piece .label{font-weight:600; font-size:12px; line-height:1.2; pointer-events:auto; cursor:text;}
  .piece .rename-input{font-family:inherit; font-weight:600; font-size:12px; width:100%; box-sizing:border-box; border:1px solid var(--rp-accent); border-radius:2px; padding:0 2px; margin:-1px -2px; background:var(--rp-paper); color:var(--rp-ink); pointer-events:auto;}
  .piece .dims{font-family:ui-monospace,monospace; font-size:9.5px; color:var(--rp-ink-soft); margin-top:auto;}
  .piece.g-common{border-color:var(--rp-common); background:var(--rp-common-bg);}
  .piece.g-bed{border-color:var(--rp-bed); background:var(--rp-bed-bg);}
  .piece.g-wet{border-color:var(--rp-wet); background:var(--rp-wet-bg);}
  .piece.g-circulation{border-color:var(--rp-circ); background:var(--rp-circ-bg);}
  .piece.tag{border-style:dashed; background:var(--rp-paper); align-items:center; justify-content:center; text-align:center; padding:2px;}
  .piece.tag .label{font-size:9px;}
  .rh{position:absolute; background:var(--rp-accent); touch-action:none; z-index:3;}
  .rh.corner{width:12px; height:12px; border:1.5px solid var(--rp-paper); border-radius:3px;}
  .rh.corner.nw{left:-6px; top:-6px; cursor:nwse-resize;}
  .rh.corner.ne{right:-6px; top:-6px; cursor:nesw-resize;}
  .rh.corner.sw{left:-6px; bottom:-6px; cursor:nesw-resize;}
  .rh.corner.se{right:-6px; bottom:-6px; cursor:nwse-resize;}
  .rh.edge{border-radius:2px; opacity:.85;}
  .rh.edge.n{top:-4px; left:10px; right:10px; height:7px; cursor:ns-resize;}
  .rh.edge.s{bottom:-4px; left:10px; right:10px; height:7px; cursor:ns-resize;}
  .rh.edge.e{right:-4px; top:10px; bottom:10px; width:7px; cursor:ew-resize;}
  .rh.edge.w{left:-4px; top:10px; bottom:10px; width:7px; cursor:ew-resize;}
  .del-btn{position:absolute; top:-26px; left:50%; transform:translateX(-50%); width:18px; height:18px; border-radius:50%; background:var(--rp-danger); color:#fff; border:1.5px solid var(--rp-paper); font-size:12px; line-height:1; display:flex; align-items:center; justify-content:center; cursor:pointer; font-weight:700; z-index:4;}
  .sidebar{display:flex; flex-direction:column; gap:12px;}
  .panel{background:var(--rp-panel); border:1px solid var(--rp-border); padding:12px;}
  .panel h2{font-size:12px; text-transform:uppercase; letter-spacing:.04em; margin:0 0 8px; color:var(--rp-ink-soft);}
  .ref-list{list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:7px;}
  .ref-list li{font-size:12px; line-height:1.4; display:flex; gap:8px;}
  .ref-list .v{font-family:ui-monospace,monospace; font-weight:600; color:var(--rp-accent-ink); background:var(--rp-accent-soft); border-radius:3px; padding:1px 6px; white-space:nowrap; height:fit-content;}
  .facts{font-size:12px; color:var(--rp-ink-soft); line-height:1.6; margin:0;}
  .editor label{display:block; font-family:ui-monospace,monospace; font-size:10px; text-transform:uppercase; letter-spacing:.04em; color:var(--rp-ink-faint); margin:9px 0 3px;}
  .editor label:first-child{margin-top:0;}
  .editor input[type="text"],.editor input[type="number"]{width:100%; font:inherit; font-size:13px; padding:6px 8px; border:1px solid var(--rp-border); border-radius:4px; background:var(--rp-paper); color:var(--rp-ink);}
  .editor .row{display:flex; gap:8px;}
  .editor .row>div{flex:1;}
  .editor .empty{font-size:12px; color:var(--rp-ink-faint); font-style:italic;}
  .editor button.del{margin-top:10px; width:100%; padding:7px; border-radius:4px; border:1px solid var(--rp-danger); background:transparent; color:var(--rp-danger); font-weight:600; font-size:12.5px; cursor:pointer;}
  .hidden{display:none !important;}
  @media (max-width:760px){ .layout{grid-template-columns:1fr;} }
`;

const HTML = `
  <div class="wrap">
    <h1 part="heading"></h1>
    <p class="sub" part="subheading"></p>
    <div class="toolbar">
      <select id="add-type"></select>
      <button id="add-btn" type="button">+ Add piece</button>
      <button id="reset-btn" type="button">Reset to starting pieces</button>
      <span class="spacer"></span>
      <span class="metric">Room area: <b id="area-total">&mdash;</b></span>
    </div>
    <div class="layout">
      <div class="canvas-scroll">
        <div class="ruler-grid">
          <div class="ruler-corner"></div>
          <div class="ruler-top" id="ruler-top"></div>
          <div class="ruler-left" id="ruler-left"></div>
          <div class="canvas" id="canvas"></div>
        </div>
      </div>
      <div class="sidebar">
        <div class="panel">
          <h2>Selected piece</h2>
          <div class="editor" id="editor"><p class="empty">Click a piece to edit it.</p></div>
        </div>
        <div class="panel" id="ref-panel" hidden>
          <h2>Reference measurements</h2>
          <ul class="ref-list" id="ref-list"></ul>
        </div>
        <div class="panel" id="notes-panel" hidden>
          <h2>Notes</h2>
          <p class="facts" id="notes-text"></p>
        </div>
      </div>
    </div>
  </div>
`;

class RoomPlannerElement extends HTMLElement {
  constructor() {
    super();
    this._state = [];
    this._selectedId = null;
    this._nextIdNum = 1;
    this._types = DEFAULT_TYPES;
    this._referenceNotes = [];
    this._notes = "";
    this._connected = false;
    this._pendingInitialState = null;
    this._lastPieceClick = null;

    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = STYLE;
    root.appendChild(style);
    const container = document.createElement("div");
    container.innerHTML = HTML;
    root.appendChild(container);

    this._els = {
      heading: root.querySelector('[part="heading"]'),
      subheading: root.querySelector('[part="subheading"]'),
      canvas: root.getElementById("canvas"),
      editor: root.getElementById("editor"),
      areaTotal: root.getElementById("area-total"),
      addType: root.getElementById("add-type"),
      addBtn: root.getElementById("add-btn"),
      resetBtn: root.getElementById("reset-btn"),
      rulerTop: root.getElementById("ruler-top"),
      rulerLeft: root.getElementById("ruler-left"),
      refPanel: root.getElementById("ref-panel"),
      refList: root.getElementById("ref-list"),
      notesPanel: root.getElementById("notes-panel"),
      notesText: root.getElementById("notes-text")
    };

    this.SCALE = 16;
    this.CANVAS_W_FT = 28;
    this.CANVAS_H_FT = 28;
    this.SNAP = 0.5;
    this.MIN_ROOM = 2;
    this.MIN_TAG = 1;
  }

  // ---- lifecycle ----
  connectedCallback() {
    if (this._connected) return;
    this._connected = true;

    this._els.heading.textContent = this.getAttribute("heading") || "Room Planner";
    this._els.subheading.textContent =
      this.getAttribute("subheading") ||
      "Drag a piece to move it. Drag any edge to extend or widen just that side, or a corner to resize both directions. Double-click a piece's name to rename it, or click it once to type exact width, height, and position. Each grid cell is 1 sq ft.";

    var attrState = this.getAttribute("initial-state");
    var starting = this._pendingInitialState;
    if (!starting && attrState) {
      try { starting = JSON.parse(attrState); } catch (e) { /* ignore bad JSON */ }
    }
    this._state = this._sanitize(starting) || cloneState(GENERIC_STATE);
    this._nextIdNum = maxIdNum(this._state) + 1;

    this._populateAddMenu();
    this._buildRuler();
    this._renderRefPanel();
    this._renderNotesPanel();
    this._wireStaticEvents();
    this._renderAll();
  }

  // ---- public API ----
  set initialState(arr) {
    this._pendingInitialState = arr;
    if (this._connected) {
      this._state = this._sanitize(arr) || cloneState(GENERIC_STATE);
      this._nextIdNum = maxIdNum(this._state) + 1;
      this._selectedId = null;
      this._renderAll();
    }
  }
  get initialState() { return this._pendingInitialState; }

  set referenceNotes(arr) {
    this._referenceNotes = Array.isArray(arr) ? arr : [];
    if (this._connected) this._renderRefPanel();
  }
  get referenceNotes() { return this._referenceNotes; }

  set notes(text) {
    this._notes = text || "";
    if (this._connected) this._renderNotesPanel();
  }
  get notes() { return this._notes; }

  set types(obj) {
    this._types = Object.assign({}, DEFAULT_TYPES, obj || {});
    if (this._connected) { this._populateAddMenu(); this._renderAll(); }
  }
  get types() { return this._types; }

  getState() { return cloneState(this._state); }

  setState(arr) {
    this._state = this._sanitize(arr) || [];
    this._nextIdNum = maxIdNum(this._state) + 1;
    this._selectedId = null;
    if (this._connected) this._renderAll();
    // Intentionally does NOT emit "change" — this is inbound hydration,
    // not a user edit, and echoing it back would create a feedback loop
    // with whatever store called setState() in the first place.
  }

  _sanitize(arr) {
    if (!Array.isArray(arr)) return null;
    return arr.filter(function (p) {
      return p && typeof p.x === "number" && typeof p.y === "number" &&
        typeof p.w === "number" && typeof p.h === "number";
    }).map(function (p) {
      return {
        id: p.id || ("p" + Math.random().toString(36).slice(2, 9)),
        type: p.type || "closet",
        label: p.label || "Room",
        x: p.x, y: p.y, w: p.w, h: p.h
      };
    });
  }

  _emitChange() {
    this.dispatchEvent(new CustomEvent("change", {
      detail: { state: this.getState() },
      bubbles: true,
      composed: true
    }));
  }

  // ---- rendering ----
  _ftStr(n) {
    var whole = Math.floor(n + 1e-9);
    var inches = Math.round((n - whole) * 12);
    if (inches === 12) { whole += 1; inches = 0; }
    return inches ? (whole + "'" + inches + '"') : (whole + "'");
  }

  _clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  _snap(v) { return Math.round(v / this.SNAP) * this.SNAP; }

  _dimsStr(w, h) {
    return this._ftStr(w) + " × " + this._ftStr(h) + "  ·  " + Math.round(w * h).toLocaleString() + " sf";
  }

  _updateAreaTotal() {
    var sum = 0;
    var types = this._types;
    this._state.forEach(function (p) {
      var meta = types[p.type];
      if (meta && !meta.tag) sum += p.w * p.h;
    });
    this._els.areaTotal.textContent = Math.round(sum).toLocaleString() + " sf";
  }

  _renderAll() {
    var c = this._els.canvas;
    c.style.width = (this.CANVAS_W_FT * this.SCALE) + "px";
    c.style.height = (this.CANVAS_H_FT * this.SCALE) + "px";
    c.innerHTML = "";
    var self = this;
    this._state.forEach(function (p) { c.appendChild(self._buildPieceEl(p)); });
    this._updateAreaTotal();
    this._renderEditor();
  }

  _groupClass(type) {
    var meta = this._types[type];
    if (!meta) return "";
    return meta.group ? "g-" + meta.group : "";
  }

  _buildPieceEl(p) {
    var self = this;
    var meta = this._types[p.type] || { label: p.label, tag: false };
    var el = document.createElement("div");
    el.className = "piece " + this._groupClass(p.type) + (meta.tag ? " tag" : "") + (p.id === this._selectedId ? " selected" : "");
    el.dataset.id = p.id;
    el.style.left = (p.x * this.SCALE) + "px";
    el.style.top = (p.y * this.SCALE) + "px";
    el.style.width = (p.w * this.SCALE) + "px";
    el.style.height = (p.h * this.SCALE) + "px";

    var content = document.createElement("div");
    content.className = "content";
    el.appendChild(content);

    var label = document.createElement("div");
    label.className = "label";
    label.textContent = p.label;
    label.title = "Double-click to rename";
    content.appendChild(label);

    if (!meta.tag) {
      var dims = document.createElement("div");
      dims.className = "dims";
      dims.textContent = this._dimsStr(p.w, p.h);
      content.appendChild(dims);
    }

    if (p.id === this._selectedId) {
      var del = document.createElement("div");
      del.className = "del-btn";
      del.textContent = "×";
      del.title = "Delete";
      del.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
      del.addEventListener("click", function (e) { e.stopPropagation(); self._deletePiece(p.id); });
      el.appendChild(del);

      if (!meta.tag) {
        ["nw", "ne", "sw", "se"].forEach(function (dir) {
          var h = document.createElement("div");
          h.className = "rh corner " + dir;
          h.addEventListener("pointerdown", function (e) { self._startResize(e, p, dir); });
          el.appendChild(h);
        });
        ["n", "s", "e", "w"].forEach(function (dir) {
          var h = document.createElement("div");
          h.className = "rh edge " + dir;
          h.addEventListener("pointerdown", function (e) { self._startResize(e, p, dir); });
          el.appendChild(h);
        });
      }
    }

    el.addEventListener("pointerdown", function (e) { self._startDrag(e, p); });
    el.addEventListener("click", function (e) {
      e.stopPropagation();
      // Double-click-to-rename, detected here (not via native "dblclick" on
      // the label) because this handler's own re-render replaces the label
      // DOM node on the first click of the pair, which breaks the browser's
      // built-in double-click tracking in some engines. Keying off the
      // piece's stable id rather than DOM node identity sidesteps that.
      var now = Date.now();
      var last = self._lastPieceClick;
      var isDoubleClick = last && last.id === p.id && now - last.time < 400;
      self._lastPieceClick = isDoubleClick ? null : { id: p.id, time: now };
      self._selectedId = p.id;
      self._renderAll();
      if (isDoubleClick) {
        var freshLabel = self._els.canvas.querySelector('.piece[data-id="' + p.id + '"] .label');
        if (freshLabel) self._startInlineRename(p, freshLabel);
      }
    });

    return el;
  }

  _startDrag(e, p) {
    if (e.target.classList.contains("rh") || e.target.classList.contains("del-btn")) return;
    e.preventDefault();
    var self = this;
    var el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    var startX = e.clientX, startY = e.clientY;
    var origX = p.x, origY = p.y;
    var moved = false;

    function onMove(ev) {
      var dxFt = (ev.clientX - startX) / self.SCALE;
      var dyFt = (ev.clientY - startY) / self.SCALE;
      if (Math.abs(dxFt) > 0.05 || Math.abs(dyFt) > 0.05) moved = true;
      var nx = self._clamp(self._snap(origX + dxFt), 0, self.CANVAS_W_FT - p.w);
      var ny = self._clamp(self._snap(origY + dyFt), 0, self.CANVAS_H_FT - p.h);
      p.x = nx; p.y = ny;
      el.style.left = (nx * self.SCALE) + "px";
      el.style.top = (ny * self.SCALE) + "px";
    }
    function onUp() {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      if (moved) self._emitChange();
    }
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
  }

  // dir is any of n,s,e,w,ne,nw,se,sw — each compass letter present
  // means that edge moves; a single-edge drag changes only ONE
  // dimension (extend/widen independently), a corner changes both.
  _startResize(e, p, dir) {
    e.preventDefault();
    e.stopPropagation();
    var self = this;
    var handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    var startX = e.clientX, startY = e.clientY;
    var orig = { x: p.x, y: p.y, w: p.w, h: p.h };
    var pieceEl = handle.parentElement;
    var dimsEl = pieceEl.querySelector(".dims");
    var meta = this._types[p.type];
    var minSz = meta && meta.tag ? this.MIN_TAG : this.MIN_ROOM;

    function onMove(ev) {
      var dxFt = (ev.clientX - startX) / self.SCALE;
      var dyFt = (ev.clientY - startY) / self.SCALE;
      var nx = orig.x, ny = orig.y, nw = orig.w, nh = orig.h;

      if (dir.indexOf("e") >= 0) {
        nw = self._clamp(self._snap(orig.w + dxFt), minSz, self.CANVAS_W_FT - orig.x);
      }
      if (dir.indexOf("w") >= 0) {
        var rightEdge = orig.x + orig.w;
        nx = self._clamp(self._snap(orig.x + dxFt), 0, rightEdge - minSz);
        nw = rightEdge - nx;
      }
      if (dir.indexOf("s") >= 0) {
        nh = self._clamp(self._snap(orig.h + dyFt), minSz, self.CANVAS_H_FT - orig.y);
      }
      if (dir.indexOf("n") >= 0) {
        var bottomEdge = orig.y + orig.h;
        ny = self._clamp(self._snap(orig.y + dyFt), 0, bottomEdge - minSz);
        nh = bottomEdge - ny;
      }

      p.x = nx; p.y = ny; p.w = nw; p.h = nh;
      pieceEl.style.left = (nx * self.SCALE) + "px";
      pieceEl.style.top = (ny * self.SCALE) + "px";
      pieceEl.style.width = (nw * self.SCALE) + "px";
      pieceEl.style.height = (nh * self.SCALE) + "px";
      if (dimsEl) dimsEl.textContent = self._dimsStr(nw, nh);
      self._updateAreaTotal();
    }
    function onUp() {
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      self._updateAreaTotal();
      if (self._selectedId === p.id) self._renderEditor();
      self._emitChange();
    }
    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  }

  _renderEditor() {
    var self = this;
    var editorEl = this._els.editor;
    var p = this._state.find(function (x) { return x.id === self._selectedId; });
    if (!p) {
      editorEl.innerHTML = '<p class="empty">Click a piece to edit it.</p>';
      return;
    }
    editorEl.innerHTML =
      '<label for="ed-label">Label</label>' +
      '<input type="text" id="ed-label" maxlength="30">' +
      '<div class="row">' +
      '<div><label for="ed-w">Width (ft)</label><input type="number" id="ed-w" step="0.5" min="0.5"></div>' +
      '<div><label for="ed-h">Height (ft)</label><input type="number" id="ed-h" step="0.5" min="0.5"></div>' +
      "</div>" +
      '<div class="row">' +
      '<div><label for="ed-x">Position X (ft)</label><input type="number" id="ed-x" step="0.5" min="0"></div>' +
      '<div><label for="ed-y">Position Y (ft)</label><input type="number" id="ed-y" step="0.5" min="0"></div>' +
      "</div>" +
      '<button class="del" id="ed-del" type="button">Delete this piece</button>';

    var labelInput = editorEl.querySelector("#ed-label");
    var wInput = editorEl.querySelector("#ed-w");
    var hInput = editorEl.querySelector("#ed-h");
    var xInput = editorEl.querySelector("#ed-x");
    var yInput = editorEl.querySelector("#ed-y");
    labelInput.value = p.label;
    wInput.value = p.w;
    hInput.value = p.h;
    xInput.value = p.x;
    yInput.value = p.y;

    var meta = this._types[p.type] || {};
    var minSz = meta.tag ? this.MIN_TAG : this.MIN_ROOM;

    labelInput.addEventListener("change", function () {
      p.label = labelInput.value.trim() || meta.label || "Room";
      self._renderAll();
      self._emitChange();
    });
    wInput.addEventListener("change", function () {
      p.w = self._clamp(self._snap(parseFloat(wInput.value) || minSz), minSz, self.CANVAS_W_FT - p.x);
      self._renderAll();
      self._emitChange();
    });
    hInput.addEventListener("change", function () {
      p.h = self._clamp(self._snap(parseFloat(hInput.value) || minSz), minSz, self.CANVAS_H_FT - p.y);
      self._renderAll();
      self._emitChange();
    });
    xInput.addEventListener("change", function () {
      p.x = self._clamp(self._snap(parseFloat(xInput.value) || 0), 0, self.CANVAS_W_FT - p.w);
      self._renderAll();
      self._emitChange();
    });
    yInput.addEventListener("change", function () {
      p.y = self._clamp(self._snap(parseFloat(yInput.value) || 0), 0, self.CANVAS_H_FT - p.h);
      self._renderAll();
      self._emitChange();
    });
    editorEl.querySelector("#ed-del").addEventListener("click", function () {
      self._deletePiece(p.id);
    });
  }

  _deletePiece(id) {
    this._state = this._state.filter(function (p) { return p.id !== id; });
    if (this._selectedId === id) this._selectedId = null;
    this._renderAll();
    this._emitChange();
  }

  // Double-click-to-rename right on the canvas — the side editor panel
  // can also rename (plus set exact width/height/position), but this is
  // the fast path most people reach for first.
  _startInlineRename(p, labelEl) {
    var self = this;
    var input = document.createElement("input");
    input.type = "text";
    input.className = "rename-input";
    input.maxLength = 30;
    input.value = p.label;
    labelEl.replaceWith(input);
    input.focus();
    input.select();

    var done = false;
    function commit() {
      if (done) return;
      done = true;
      var val = input.value.trim();
      p.label = val || p.label;
      self._renderAll();
      self._emitChange();
    }
    function cancel() {
      if (done) return;
      done = true;
      self._renderAll();
    }
    input.addEventListener("blur", commit);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        input.blur();
      } else if (e.key === "Escape") {
        e.preventDefault();
        input.removeEventListener("blur", commit);
        cancel();
      }
    });
    input.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
    input.addEventListener("click", function (e) { e.stopPropagation(); });
  }

  _addPiece(type) {
    var meta = this._types[type];
    if (!meta) return;
    this._nextIdNum = Math.max(this._nextIdNum, maxIdNum(this._state) + 1);
    var id = "p" + this._nextIdNum;
    this._nextIdNum++;
    var p = { id: id, type: type, label: meta.label, x: 0.5, y: 0.5, w: meta.w, h: meta.h };
    this._state.push(p);
    this._selectedId = id;
    this._renderAll();
    this._emitChange();
  }

  _resetBoard() {
    this._state = this._sanitize(this._pendingInitialState) || cloneState(GENERIC_STATE);
    this._nextIdNum = maxIdNum(this._state) + 1;
    this._selectedId = null;
    this._renderAll();
    this._emitChange();
  }

  _populateAddMenu() {
    var sel = this._els.addType;
    sel.innerHTML = "";
    var types = this._types;
    Object.keys(types).forEach(function (key) {
      var opt = document.createElement("option");
      opt.value = key;
      opt.textContent = types[key].label;
      sel.appendChild(opt);
    });
  }

  _buildRuler() {
    var top = this._els.rulerTop, left = this._els.rulerLeft;
    top.innerHTML = ""; left.innerHTML = "";
    top.style.width = (this.CANVAS_W_FT * this.SCALE) + "px";
    left.style.height = (this.CANVAS_H_FT * this.SCALE) + "px";
    for (var x = 0; x <= this.CANVAS_W_FT; x += 5) {
      var s = document.createElement("span");
      s.style.left = (x * this.SCALE) + "px";
      s.textContent = String(x);
      top.appendChild(s);
    }
    for (var y = 0; y <= this.CANVAS_H_FT; y += 5) {
      var s2 = document.createElement("span");
      s2.style.top = (y * this.SCALE - 6) + "px";
      s2.textContent = String(y);
      left.appendChild(s2);
    }
  }

  _renderRefPanel() {
    var list = this._els.refList;
    list.innerHTML = "";
    var notes = this._referenceNotes || [];
    this._els.refPanel.hidden = notes.length === 0;
    notes.forEach(function (n) {
      var li = document.createElement("li");
      var v = document.createElement("span");
      v.className = "v";
      v.textContent = n.value;
      li.appendChild(v);
      li.appendChild(document.createTextNode(n.label));
      list.appendChild(li);
    });
  }

  _renderNotesPanel() {
    this._els.notesPanel.hidden = !this._notes;
    this._els.notesText.textContent = this._notes || "";
  }

  _wireStaticEvents() {
    var self = this;
    this._els.canvas.addEventListener("click", function () {
      self._selectedId = null;
      self._renderAll();
    });
    this._els.addBtn.addEventListener("click", function () {
      self._addPiece(self._els.addType.value);
    });

    var resetArmed = false;
    this._els.resetBtn.addEventListener("click", function () {
      if (!resetArmed) {
        resetArmed = true;
        self._els.resetBtn.classList.add("danger-arm");
        self._els.resetBtn.textContent = "Click again to confirm reset";
        setTimeout(function () {
          resetArmed = false;
          self._els.resetBtn.classList.remove("danger-arm");
          self._els.resetBtn.textContent = "Reset to starting pieces";
        }, 3000);
        return;
      }
      resetArmed = false;
      self._els.resetBtn.classList.remove("danger-arm");
      self._els.resetBtn.textContent = "Reset to starting pieces";
      self._resetBoard();
    });
  }
}

function cloneState(arr) {
  return arr.map(function (p) { return Object.assign({}, p); });
}

function maxIdNum(state) {
  var m = 0;
  (state || []).forEach(function (p) {
    var n = parseInt(String(p.id || "").replace(/[^0-9]/g, ""), 10);
    if (!isNaN(n) && n > m) m = n;
  });
  return m;
}

if (!customElements.get("room-planner")) {
  customElements.define("room-planner", RoomPlannerElement);
}

export { RoomPlannerElement, DEFAULT_TYPES, GENERIC_STATE };
