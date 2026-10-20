// Draws the background scenery (sky pieces + the hill panorama) and writes it
// into public/index.html between the <!-- scenery:...:start/end --> markers.
//
//   node scripts/build-scenery.mjs
//
// The art is one painted countryside with small homages to well-loved films,
// placed where they'd naturally live in the landscape (the approach the Roku
// City screensaver takes with its city). Day colors are drawn once; at night a
// moonlight layer is multiplied over the scene and the lights glow above it.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const INDEX = path.join(here, '..', 'public', 'index.html');

const W = 1600;
const H = 380;
const r = (n) => Math.round(n * 10) / 10;

// ---------- geometry helpers ----------

// Point on a cubic bezier, and y on a path made of consecutive cubic segments.
function bez(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}
function curve(start, segs) {
  const d = [`M${start[0]} ${start[1]}`];
  const pts = [];
  let p0 = start;
  for (const [p1, p2, p3] of segs) {
    d.push(`C${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]} ${p3[0]} ${p3[1]}`);
    for (let i = 0; i <= 60; i++) pts.push(bez(p0, p1, p2, p3, i / 60));
    p0 = p3;
  }
  const yAt = (x) => {
    let best = pts[0];
    for (const p of pts) if (Math.abs(p[0] - x) < Math.abs(best[0] - x)) best = p;
    return best[1];
  };
  return { d: d.join(' '), yAt };
}

// Deterministic pseudo-random numbers so rebuilding gives identical art.
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

// ---------- palette (day; night is a multiply layer + lights) ----------

const C = {
  far: '#c9dcd8',
  mtnLit: '#bfd3cd',
  mtnShade: '#9fb8b3',
  snow: '#fbfcf7',
  snowShade: '#dfe7ea',
  tower: '#c49d7e',
  towerLit: '#d9b796',
  towerShade: '#a37f64',
  emerald: '#4fa871',
  emeraldLit: '#8fd6a6',
  emeraldDeep: '#2f7d50',
  dino: '#9db4ad',
  midTop: '#b7d494',
  midBottom: '#9cc27a',
  nearTop: '#8fbc69',
  nearBottom: '#6f9f4f',
  ridge: '#d2e6b3',
  tree: ['#5c8c45', '#4f7d3c', '#6b9a4f'],
  treeLit: '#86b55f',
  trunk: '#6b4f3a',
  road: '#e2cf9f',
  roadEdge: '#c8b07c',
  brick: '#eac54f',
  brickLine: '#c99a2c',
  water: '#8ec7df',
  waterDeep: '#6eaecb',
  ink: '#3e3128',
  house: '#f6f1e7',
  houseShade: '#ddd5c6',
  roofGrey: '#7b8794',
  corn: '#d9c467',
  cornDark: '#b9a24a',
  infield: '#c9915e',
  grass: '#95c46c',
};

// ---------- sky pieces (live in the side margins) ----------

function twinSuns() {
  return `<svg class="art art-right day-only" viewBox="0 0 140 100">
      <defs>
        <radialGradient id="sunA" cx="0.4" cy="0.38" r="0.65"><stop offset="0" stop-color="#ffe29a"/><stop offset="0.7" stop-color="#f6ae47"/><stop offset="1" stop-color="#ec9535"/></radialGradient>
        <radialGradient id="sunB" cx="0.4" cy="0.38" r="0.65"><stop offset="0" stop-color="#fff3c8"/><stop offset="0.7" stop-color="#fbd77c"/><stop offset="1" stop-color="#f3c25e"/></radialGradient>
        <radialGradient id="halo"><stop offset="0" stop-color="#ffd27a" stop-opacity="0.45"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient>
      </defs>
      <circle cx="52" cy="58" r="44" fill="url(#halo)"/>
      <circle cx="104" cy="36" r="30" fill="url(#halo)"/>
      <circle cx="52" cy="58" r="24" fill="url(#sunA)"/>
      <circle cx="104" cy="36" r="13.5" fill="url(#sunB)"/>
    </svg>`;
}

function etMoon() {
  // The moon, with the bike and its passenger in silhouette: a hooded rider
  // hunched over the bars, and a bundled figure in the front basket.
  return `<svg class="art art-right night-only" viewBox="0 0 160 150">
      <defs>
        <radialGradient id="moon" cx="0.42" cy="0.4" r="0.62"><stop offset="0" stop-color="#fffaf0"/><stop offset="0.75" stop-color="#f3e9cf"/><stop offset="1" stop-color="#e2d4b2"/></radialGradient>
        <radialGradient id="moonHalo"><stop offset="0.55" stop-color="#f7edd2" stop-opacity="0.28"/><stop offset="1" stop-color="#f7edd2" stop-opacity="0"/></radialGradient>
      </defs>
      <circle cx="84" cy="70" r="76" fill="url(#moonHalo)"/>
      <circle cx="84" cy="70" r="54" fill="url(#moon)"/>
      <g fill="#e4d8bb" opacity="0.8"><circle cx="66" cy="50" r="7"/><circle cx="104" cy="88" r="10"/><circle cx="110" cy="48" r="4.5"/><circle cx="72" cy="98" r="5"/></g>
      <g transform="translate(46 70) rotate(-8)" fill="#121a2b">
        <g fill="none" stroke="#121a2b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="14" cy="38" r="10.5"/><circle cx="62" cy="38" r="10.5"/>
          <path d="M14 38 L30 24 L50 24 L62 38 M30 24 L37 38 L50 24 M37 38 L30 24 M29 24 L27 19 M50 24 L53 14 L59 13"/>
        </g>
        <path d="M24 17 L33 16 L31 19 L24 19 Z"/>
        <path d="M29 18 C27 10 30 2 37 -3 C42 -6 46 -4 47 -1 C49 4 46 8 45 11 L52 13 L51 15.5 L43 15 C41 18 38 20 34 21 Z"/>
        <path d="M33 21 L37 30 L35 31 L31 23 Z"/>
        <path d="M54 9 L67 9 L65 17 L56 17 Z"/>
        <path d="M57 9 C56 3 59 -1 62.5 -1 C66 -1 68 3 67 8 C70 8 71 10 69 11 L56 11 C54 11 54 9 57 9 Z"/>
      </g>
    </svg>`;
}

function upHouse() {
  // A small clapboard house with a porch and chimney, lifted by a dense,
  // teardrop-shaped cluster of balloons whose strings meet at the chimney.
  const colors = ['#e9644a', '#f2a541', '#f6d258', '#8cc56b', '#4fb3c7', '#5f84d1', '#a874c9', '#ef8bb0', '#f37e5b', '#7ccdb0'];
  const balloons = [];
  seed = 11;
  for (let i = 0; i < 64; i++) {
    const a = rand() * Math.PI * 2;
    const rr = Math.sqrt(rand());
    const x = 60 + Math.cos(a) * rr * 42;
    const y = 46 + Math.sin(a) * rr * 34 - (1 - rr) * 4;
    balloons.push({ x, y, c: colors[i % colors.length], s: 5.2 + rand() * 2.2 });
  }
  balloons.sort((a, b) => a.y - b.y);
  const strings = balloons
    .filter((_, i) => i % 3 === 0)
    .map((b) => `<path d="M${r(b.x)} ${r(b.y + b.s)} Q${r((b.x + 62) / 2)} ${r((b.y + 120) / 2 + 8)} 62 118"/>`)
    .join('');
  const bs = balloons
    .map(
      (b) =>
        `<ellipse cx="${r(b.x)}" cy="${r(b.y)}" rx="${r(b.s)}" ry="${r(b.s * 1.12)}" fill="${b.c}"/><ellipse cx="${r(b.x - b.s * 0.35)}" cy="${r(b.y - b.s * 0.45)}" rx="${r(b.s * 0.28)}" ry="${r(b.s * 0.4)}" fill="#fff" opacity="0.45"/>`,
    )
    .join('');
  return `<svg class="art art-left art-balloons" viewBox="0 0 120 170">
      <g stroke="#7a6a5a" stroke-width="0.45" fill="none" opacity="0.65">${strings}</g>
      ${bs}
      <g transform="translate(36 116)">
        <rect x="23" y="0" width="5" height="10" fill="#a0523d"/>
        <path d="M2 18 L26 3 L50 18 Z" fill="#7d6a8f"/>
        <path d="M2 18 L26 3 L50 18" fill="none" stroke="#5e4f70" stroke-width="1"/>
        <rect x="6" y="17" width="40" height="22" fill="#f2d8a7"/>
        <g stroke="#d9bd88" stroke-width="0.6">${[21, 24, 27, 30, 33, 36].map((y) => `<line x1="6" y1="${y}" x2="46" y2="${y}"/>`).join('')}</g>
        <path d="M20 17 L26 12 L32 17 Z" fill="#8bb8c7"/>
        <rect x="11" y="22" width="7" height="8" fill="#8bc3d6" stroke="#fff" stroke-width="0.8"/>
        <rect x="34" y="22" width="7" height="8" fill="#8bc3d6" stroke="#fff" stroke-width="0.8"/>
        <rect x="22" y="26" width="8" height="13" fill="#b56b4a"/>
        <path d="M4 30 L48 30 L48 32 L4 32 Z" fill="#f8f3ea"/>
        <g stroke="#f8f3ea" stroke-width="1.2">${[6, 14, 38, 46].map((x) => `<line x1="${x}" y1="32" x2="${x}" y2="39"/>`).join('')}</g>
      </g>
    </svg>`;
}

function kiki() {
  // A girl in a dark dress with a big red bow, riding side-saddle on her broom,
  // her black cat perched behind and a little radio hanging from the handle.
  return `<svg class="art art-kiki" viewBox="0 0 140 80">
      <g transform="rotate(-12 70 40)">
        <path d="M8 46 L110 40" stroke="#6b4a2e" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M106 37 C116 34 128 33 138 30 C132 37 133 41 139 47 C128 46 117 45 107 44 Z" fill="#c9a25e"/>
        <g stroke="#a98444" stroke-width="0.7"><path d="M110 39 L136 33 M110 42 L137 41 M110 44 L136 46"/></g>
        <path d="M18 46 L18 54" stroke="#3a2c22" stroke-width="1"/>
        <rect x="12" y="54" width="12" height="8" rx="2" fill="#c9553a"/>
        <circle cx="15.5" cy="58" r="2" fill="#f2e6d2"/>
        <path d="M54 45 C50 36 50 28 55 22 C60 17 68 17 72 22 C76 28 76 37 74 44 Z" fill="#26304a"/>
        <path d="M55 44 L52 54 L57 54 L60 45 Z M66 44 L68 53 L73 52 L70 44 Z" fill="#26304a"/>
        <path d="M51 54 L58 54 L58 56 L50 56 Z M67 53 L74 52 L74.5 54 L67.5 55 Z" fill="#7a3b2a"/>
        <circle cx="64" cy="14" r="6.4" fill="#f1cfa8"/>
        <path d="M57.6 13 C57 6 62 3 66 4 C70 5 72 8 71 13 C69 10 66 9 63 10 C61 10 59 12 57.6 13 Z" fill="#3a2a22"/>
        <path d="M63 3.5 L54 -3 L56 6 Z M65 3.5 L74 -3 L72 6 Z" fill="#e2443a"/>
        <circle cx="64" cy="4" r="2" fill="#c7332c"/>
        <path d="M55 24 C48 26 44 30 42 35" stroke="#26304a" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M30 41 C30 35 33 32 37 32 L38 28 L40 32 L42 28.5 L43 33 C46 35 46 40 44 42 Z" fill="#141414"/>
        <path d="M30 41 C25 40 22 36 23 32" stroke="#141414" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        <circle cx="39" cy="35" r="0.9" fill="#f2e27a"/><circle cx="42" cy="35" r="0.9" fill="#f2e27a"/>
      </g>
    </svg>`;
}

// ---------- the hill panorama ----------

function mountains() {
  // Faceted peaks lit from the right (where the suns are), with snowcaps.
  const peaks = [
    [168, 92, 96],
    [250, 66, 118],
    [338, 104, 92],
    [420, 74, 120],
    [508, 116, 96],
    [580, 136, 70],
  ];
  const base = 214;
  return peaks
    .map(([cx, top, hw]) => {
      const h = base - top;
      const shade = `M${cx - hw} ${base} L${cx} ${top} L${cx + hw * 0.12} ${base} Z`;
      const lit = `M${cx} ${top} L${cx + hw} ${base} L${cx + hw * 0.12} ${base} Z`;
      const s = (fx, fy) => `${r(cx + hw * fx)} ${r(top + h * fy)}`;
      const snowL = `M${cx} ${top} L${s(-0.26, 0.27)} L${s(-0.16, 0.22)} L${s(-0.09, 0.31)} L${s(-0.02, 0.24)} L${cx} ${top + h * 0.27} Z`;
      const snowR = `M${cx} ${top} L${cx} ${top + h * 0.27} L${s(0.08, 0.21)} L${s(0.15, 0.3)} L${s(0.24, 0.22)} L${s(0.3, 0.27)} Z`;
      return `<path d="${shade}" fill="${C.mtnShade}"/><path d="${lit}" fill="${C.mtnLit}"/><path d="${snowL}" fill="${C.snowShade}"/><path d="${snowR}" fill="${C.snow}"/>`;
    })
    .join('');
}

function devilsTower() {
  // Close Encounters: the flat-topped, column-fluted butte rising from a talus
  // skirt. At night the mothership hangs over it.
  const flutes = [];
  for (let x = 681; x <= 727; x += 5) {
    flutes.push(`<path d="M${x} ${x < 704 ? 121 : 120} L${x + (x - 704) * 0.06} 184" stroke="${x < 704 ? C.towerShade : C.towerLit}" stroke-width="1.6" opacity="0.7"/>`);
  }
  return `<g>
        <path d="M630 218 C650 212 662 198 668 184 C690 180 720 180 742 184 C748 198 760 212 780 218 Z" fill="${C.towerShade}"/>
        <path d="M705 182 C722 181 736 182 742 184 C748 198 760 212 780 218 L716 218 C716 206 712 192 705 182 Z" fill="${C.tower}" opacity="0.8"/>
        <g fill="${C.towerLit}" opacity="0.5"><circle cx="668" cy="204" r="2"/><circle cx="684" cy="196" r="1.6"/><circle cx="742" cy="200" r="2"/><circle cx="756" cy="210" r="1.6"/><circle cx="652" cy="212" r="1.4"/></g>
        <path d="M672 186 C674 160 676 138 678 122 C690 116 718 115 730 120 C733 138 735 160 738 186 Z" fill="${C.tower}"/>
        <path d="M704 117 C716 116 726 117 730 120 C733 138 735 160 738 186 L706 186 Z" fill="${C.towerLit}" opacity="0.55"/>
        ${flutes.join('')}
        <path d="M678 122 C690 116 718 115 730 120 C716 119 692 119 678 122 Z" fill="${C.towerLit}"/>
      </g>`;
}

function mothership() {
  const lights = [];
  const cols = ['#ffd37a', '#ff8f6b', '#8fe1ff', '#c6a0ff', '#9effa8'];
  for (let i = 0; i < 17; i++) {
    const t = i / 16;
    const x = 636 + t * 136;
    const y = 82 + Math.sin(t * Math.PI) * 9;
    lights.push(`<circle cx="${r(x)}" cy="${r(y)}" r="2.4" fill="${cols[i % cols.length]}"/>`);
  }
  return `<g class="night-only-svg">
        <defs>
          <linearGradient id="beamCE" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2c9" stop-opacity="0.55"/><stop offset="1" stop-color="#fff2c9" stop-opacity="0"/></linearGradient>
          <radialGradient id="shipGlow"><stop offset="0" stop-color="#fff0c0" stop-opacity="0.6"/><stop offset="1" stop-color="#fff0c0" stop-opacity="0"/></radialGradient>
        </defs>
        <ellipse cx="704" cy="84" rx="120" ry="44" fill="url(#shipGlow)"/>
        <path d="M676 92 L732 92 L748 120 L660 120 Z" fill="url(#beamCE)"/>
        <ellipse cx="704" cy="72" rx="44" ry="13" fill="#3a4466"/>
        <ellipse cx="704" cy="82" rx="72" ry="12" fill="#56628a"/>
        <ellipse cx="704" cy="86" rx="60" ry="7" fill="#ffeab0" opacity="0.85"/>
        <g class="blink">${lights.join('')}</g>
      </g>`;
}

function emeraldCity(x, base) {
  const towers = [
    [-46, 26, 6, 10],
    [-34, 46, 7, 14],
    [-20, 62, 8, 18],
    [-6, 98, 10, 30],
    [10, 74, 8, 22],
    [24, 54, 7, 16],
    [37, 36, 6, 12],
    [48, 22, 5, 9],
  ];
  const parts = towers
    .map(([dx, h, hw, cap]) => {
      const cx = x + dx;
      const top = base - h;
      return `<path d="M${cx - hw} ${base} L${cx - hw} ${top} L${cx} ${top - cap} L${cx + hw} ${top} L${cx + hw} ${base} Z" fill="${C.emerald}"/>
        <path d="M${cx} ${top - cap} L${cx + hw} ${top} L${cx + hw} ${base} L${cx + hw * 0.35} ${base} L${cx + hw * 0.35} ${top} Z" fill="${C.emeraldLit}" opacity="0.6"/>
        <path d="M${cx - hw} ${top} L${cx} ${top - cap} L${cx} ${top} Z" fill="${C.emeraldDeep}" opacity="0.5"/>`;
    })
    .join('');
  return `<g>${parts}<rect x="${x - 54}" y="${base - 10}" width="108" height="10" fill="${C.emeraldDeep}"/></g>`;
}

function brachiosaur(x, y, s, flip = false) {
  // Long upright neck, small domed head, shoulders higher than the hips.
  const d =
    'M64 -26 C52 -34 40 -44 30 -50 C20 -58 6 -62 -4 -64 C-10 -90 -18 -125 -26 -142 C-29 -150 -36 -153 -43 -149 C-47 -146 -47 -141 -43 -140 C-38 -139 -33 -139 -31 -136 C-24 -118 -18 -92 -14 -62 C-18 -52 -20 -40 -18 -24 L-16 0 L-7 0 L-6 -22 C4 -26 16 -26 24 -24 L26 0 L35 0 L36 -26 C46 -26 56 -24 64 -26 Z';
  return `<path transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})" d="${d}" fill="${C.dino}"/>`;
}

function tree(x, y, s = 1, kind = 0) {
  const c = C.tree[kind % 3];
  return `<g transform="translate(${r(x)} ${r(y)}) scale(${r(s)})">
        <rect x="-1.6" y="-8" width="3.2" height="8" fill="${C.trunk}"/>
        <circle cx="0" cy="-16" r="10" fill="${c}"/>
        <circle cx="-7" cy="-11" r="7" fill="${c}"/>
        <circle cx="7" cy="-11" r="7.5" fill="${c}"/>
        <circle cx="4" cy="-20" r="5.5" fill="${C.treeLit}" opacity="0.55"/>
        <circle cx="9" cy="-13" r="3.5" fill="${C.treeLit}" opacity="0.45"/>
      </g>`;
}

function treeLine(x0, x1, yAt, { s = 0.7, gap = 13, jitter = 3 } = {}) {
  const out = [];
  for (let x = x0; x <= x1; x += gap + rand() * 6) {
    out.push(tree(x, yAt(x) + 2 + rand() * jitter, s * (0.8 + rand() * 0.35), Math.floor(rand() * 3)));
  }
  return out.join('');
}

function walker(kind, x, y) {
  // The Fellowship, all facing left (toward the mountains), mid-stride.
  const legs = (h, w = 1.4) =>
    `<path d="M-1 ${-h} L-3.5 0 M1 ${-h} L3 0" stroke="${C.ink}" stroke-width="${w}" stroke-linecap="round"/>`;
  const shapes = {
    gandalf: `${legs(6)}<path d="M-5 -6 L-3.5 -19 L3.5 -19 L5.5 -6 Z"/><circle cx="-0.5" cy="-21.5" r="2.4"/><path d="M-6 -22.5 L5 -22.5 L4 -21 L-5 -21 Z"/><path d="M-3 -22.5 L1.5 -33 L2.5 -22.5 Z"/><path d="M-1 -19 L-3.5 -13 L-1.5 -12 Z" fill="#e8e2d6"/><path d="M-8 -36 L-8 0" stroke="${C.ink}" stroke-width="1.3"/><circle class="staff-tip" cx="-8" cy="-36.5" r="1.6"/>`,
    aragorn: `${legs(7)}<path d="M-4 -7 L-3 -18 L3.5 -18 L4.5 -7 Z"/><path d="M-3.4 -18.5 C-3.6 -23.5 3.6 -23.5 3.4 -18.5 L4 -15 L-4 -15 Z"/><path d="M3 -12 L7 -2" stroke="${C.ink}" stroke-width="1"/>`,
    boromir: `${legs(7)}<path d="M-4.5 -7 L-3.5 -18 L4 -18 L5 -7 Z"/><circle cx="0" cy="-20.5" r="2.5"/><circle cx="4.5" cy="-12" r="4" fill="#5a4636"/><circle cx="4.5" cy="-12" r="1.2"/>`,
    legolas: `${legs(7.5, 1.2)}<path d="M-3 -7.5 L-2.5 -18.5 L2.5 -18.5 L3.2 -7.5 Z"/><circle cx="0" cy="-21" r="2.2"/><path d="M-1 -23 L3.5 -15" stroke="#e8dcb8" stroke-width="0.8"/><path d="M3 -26 Q9 -14 3 -2" fill="none" stroke="${C.ink}" stroke-width="0.9"/>`,
    gimli: `${legs(4, 1.8)}<path d="M-5 -4 L-4.5 -12 L4.5 -12 L5 -4 Z"/><circle cx="0" cy="-14" r="2.6"/><path d="M-3 -15.5 L3 -15.5 L2.5 -17.5 L-2.5 -17.5 Z"/><path d="M-2 -13 C-3 -8 -1 -6 0 -6 C1 -6 3 -8 2 -13 Z" fill="#8a5a36"/><path d="M5.5 -19 L5 -1" stroke="${C.ink}" stroke-width="1.2"/><path d="M5.3 -19 C10 -21 10 -14 5.3 -15 Z M5.3 -19 C0.6 -21 0.6 -14 5.3 -15 Z"/>`,
    hobbit: `${legs(3.5)}<path d="M-3 -3.5 L-2.6 -10 L2.6 -10 L3.2 -3.5 Z"/><circle cx="0" cy="-12" r="2.2"/>`,
    sam: `${legs(3.5)}<path d="M-3 -3.5 L-2.6 -10 L2.6 -10 L3.2 -3.5 Z"/><circle cx="0" cy="-12" r="2.3"/><rect x="1.5" y="-12" width="4.5" height="6" rx="1"/><circle cx="5" cy="-5.5" r="1.6" fill="#7d7d7d"/>`,
  };
  return `<g transform="translate(${r(x)} ${r(y)})">${shapes[kind]}</g>`;
}

function delorean() {
  // Back to the Future: the stainless wedge with twin fire trails.
  return `<g class="delorean">
        <defs>
          <linearGradient id="fire" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fff2a8"/><stop offset="0.25" stop-color="#ffb43c"/><stop offset="0.7" stop-color="#ff5a1f" stop-opacity="0.7"/><stop offset="1" stop-color="#ff5a1f" stop-opacity="0"/></linearGradient>
          <linearGradient id="steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef0f2"/><stop offset="0.6" stop-color="#bfc4ca"/><stop offset="1" stop-color="#8e949b"/></linearGradient>
        </defs>
        <g class="fire-trails"><rect x="-150" y="12.2" width="150" height="2.4" rx="1.2" fill="url(#fire)"/><rect x="-118" y="15.4" width="122" height="2.4" rx="1.2" fill="url(#fire)"/></g>
        <g class="car-body">
        <path d="M0 13 L1 8.5 L12 6.5 L22 2 L33 1.5 L40 6 L50 7.5 L52 10 L51.5 14 L0.5 14.5 Z" fill="url(#steel)"/>
        <path d="M21 6.2 L23.5 2.8 L32.5 2.4 L37.5 6.2 Z" fill="#2e3542"/>
        <path d="M24 6.2 L25.5 3.2 L28.5 3.1 L28.5 6.2 Z" fill="#5a6a80"/>
        <rect x="1" y="11.6" width="50.5" height="1.4" fill="#4a4f57"/>
        <path d="M2 9 L9 8 L9 10 L2 10.6 Z" fill="#2a2e35"/>
        <circle cx="11.5" cy="14.5" r="3.6" fill="#1d1f24"/><circle cx="11.5" cy="14.5" r="1.4" fill="#9aa1a9"/>
        <circle cx="41" cy="14.5" r="3.6" fill="#1d1f24"/><circle cx="41" cy="14.5" r="1.4" fill="#9aa1a9"/>
        </g>
        <path class="headlight" d="M52 9.5 L90 4 L90 17 L52 11.5 Z" fill="#fff6c8" opacity="0"/>
      </g>`;
}

function fieldOfDreams(x, y) {
  // Field of Dreams: a white farmhouse, a baseball diamond, and the corn.
  const corn = [];
  corn.push(`<rect x="${x + 40}" y="${y - 10}" width="${92}" height="${16}" rx="3" fill="#7fa64c"/>`);
  for (let i = 0; i < 30; i++) {
    const cx = x + 42 + i * 3;
    const h = 15 + ((i * 7) % 4);
    corn.push(`<path d="M${r(cx)} ${y + 6} L${r(cx)} ${y + 6 - h}" stroke="${i % 2 ? '#6f9a3e' : '#86ad4f'}" stroke-width="1.8"/><path d="M${r(cx - 1.4)} ${y + 6 - h + 2} L${r(cx)} ${y + 6 - h - 2.5} L${r(cx + 1.4)} ${y + 6 - h + 2} Z" fill="${C.corn}"/>`);
  }
  return `<g>
        ${corn.join('')}
        <ellipse cx="${x + 70}" cy="${y + 13}" rx="36" ry="7.5" fill="${C.grass}"/>
        <path d="M${x + 70} ${y + 6.5} L${x + 84} ${y + 12.5} L${x + 70} ${y + 18.5} L${x + 56} ${y + 12.5} Z" fill="${C.infield}"/>
        <path d="M${x + 70} ${y + 9.5} L${x + 77.5} ${y + 12.5} L${x + 70} ${y + 15.5} L${x + 62.5} ${y + 12.5} Z" fill="${C.grass}"/>
        <g fill="#fff"><rect x="${x + 69}" y="${y + 17.6}" width="2" height="1.4"/><rect x="${x + 82.5}" y="${y + 11.8}" width="1.6" height="1.4"/><rect x="${x + 69.2}" y="${y + 5.8}" width="1.6" height="1.4"/><rect x="${x + 55.8}" y="${y + 11.8}" width="1.6" height="1.4"/></g>
        <g transform="translate(${x} ${y - 4})">
          <path d="M-2 -14 L14 -26 L30 -14 Z" fill="${C.roofGrey}"/>
          <rect x="1" y="-14.5" width="26" height="18" fill="${C.house}"/>
          <rect x="19" y="-14.5" width="8" height="18" fill="${C.houseShade}"/>
          <rect x="11" y="-24" width="6" height="6" fill="${C.house}"/>
          <rect class="window" x="12.4" y="-22.8" width="3.2" height="3.2" fill="#9cc6d6"/>
          <rect class="window" x="4" y="-10.5" width="4" height="4.5" fill="#9cc6d6"/>
          <rect class="window" x="20" y="-10.5" width="4" height="4.5" fill="#9cc6d6"/>
          <rect x="-1" y="-3" width="30" height="2" fill="#efe8da"/>
          <g stroke="#efe8da" stroke-width="1">${[0, 9, 19, 28].map((px) => `<line x1="${px}" y1="-1" x2="${px}" y2="3.5"/>`).join('')}</g>
          <rect x="12" y="-1" width="4" height="4.5" fill="#8a6a50"/>
        </g>
      </g>`;
}

function soundOfMusic(x, y) {
  // A figure spinning on the hilltop, arms flung wide, skirt flaring.
  return `<g transform="translate(${x} ${y})" fill="${C.ink}">
        <path d="M-6.5 0 C-5 -4 -3 -8 -2 -10 L2 -10 C3 -8 5 -4 6.5 0 Z"/>
        <path d="M-1.8 -10 L-1.8 -16 L1.8 -16 L1.8 -10 Z"/>
        <circle cx="0" cy="-18.4" r="2.4"/>
        <path d="M-1.6 -15 L-10 -20 M1.6 -15 L10 -20" stroke="${C.ink}" stroke-width="1.3" stroke-linecap="round"/>
      </g>`;
}

function jurassicGate(x, y) {
  // The great wooden gate with torches on each pillar.
  return `<g transform="translate(${x} ${y})">
        <path d="M-30 0 L-30 -40 L-22 -40 L-22 0 Z M22 0 L22 -40 L30 -40 L30 0 Z" fill="#7a5a3e"/>
        <path d="M-27 -40 L-27 0 M25 -40 L25 0" stroke="#5f4530" stroke-width="1.5"/>
        <path d="M-36 -44 L36 -44 L32 -38 L-32 -38 Z" fill="#6b4f36"/>
        <path d="M-33 -47 L33 -47 L36 -44 L-36 -44 Z" fill="#8a6a4a"/>
        <path d="M-21 -36 L-1 -36 L-1 0 L-21 0 Z M1 -36 L21 -36 L21 0 L1 0 Z" fill="#8c6b4c"/>
        <g stroke="#6d5139" stroke-width="1">${[-18, -13, -8, -4, 4, 8, 13, 18].map((px) => `<line x1="${px}" y1="-34" x2="${px}" y2="0"/>`).join('')}</g>
        <rect x="-28" y="-54" width="4" height="7" fill="#4a3626"/><rect x="24" y="-54" width="4" height="7" fill="#4a3626"/>
        <path class="torch" d="M-26 -54 C-30 -58 -27 -63 -26 -66 C-25 -63 -22 -58 -26 -54 Z M26 -54 C22 -58 25 -63 26 -66 C27 -63 30 -58 26 -54 Z" fill="#ffb347"/>
      </g>`;
}

function busStop(x, y) {
  // My Neighbor Totoro: the little country bus stop, a child waiting under an umbrella.
  return `<g transform="translate(${x} ${y})">
        <rect x="-1.1" y="-30" width="2.2" height="30" fill="#5a4a3c"/>
        <circle cx="0" cy="-33" r="7" fill="#f4efe2" stroke="#5a4a3c" stroke-width="1.4"/>
        <circle cx="0" cy="-33" r="4" fill="none" stroke="#c9553a" stroke-width="1.2"/>
        <rect x="-4.5" y="-24" width="9" height="11" rx="1" fill="#f4efe2" stroke="#5a4a3c" stroke-width="0.8"/>
        <path d="M-3 -21 H3 M-3 -18.5 H3 M-3 -16 H1" stroke="#8a7a6a" stroke-width="0.8"/>
        <g transform="translate(12 0)">
          <path d="M-2.4 0 L-2.2 -8 L2.4 -8 L2.6 0 Z" fill="#e2b43a"/>
          <circle cx="0" cy="-9.6" r="2.1" fill="#3a2a22"/>
          <path d="M1.5 -9 L1.5 -15" stroke="#3a2a22" stroke-width="0.8"/>
          <path d="M-7 -15 Q1.5 -23 10 -15 Z" fill="#2d3340"/>
        </g>
      </g>`;
}

function jawsLake(x, y) {
  return `<g>
        <defs><linearGradient id="lake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.water}"/><stop offset="1" stop-color="${C.waterDeep}"/></linearGradient></defs>
        <ellipse cx="${x}" cy="${y}" rx="112" ry="17" fill="url(#lake)"/>
        <ellipse cx="${x}" cy="${y - 1}" rx="104" ry="13" fill="none" stroke="#fff" stroke-width="0.8" opacity="0.35"/>
        <g stroke="#7a5a3e" stroke-width="2.4"><path d="M${x - 108} ${y - 3} L${x - 70} ${y - 3}"/></g>
        <g stroke="#5f4530" stroke-width="1.4">${[-104, -94, -84, -74].map((dx) => `<path d="M${x + dx} ${y - 3} L${x + dx} ${y + 3}"/>`).join('')}</g>
        <g transform="translate(${x + 70} ${y + 2})"><path d="M-2.4 0 L-2 -6 L2 -6 L2.4 0 Z" fill="#e8463a"/><rect x="-2.2" y="-4.2" width="4.4" height="1.6" fill="#fff"/></g>
        <g class="fin">
          <path d="M-14 4 L-4 0 M14 4 L4 0" stroke="#fff" stroke-width="0.9" opacity="0.6"/>
          <path d="M-5 0 C-3 -6 1 -12 7 -15 C5.5 -9 5.6 -4 8 0 Z" fill="#56656f"/>
          <path d="M1 -9 C2.5 -11.5 4.5 -13.5 7 -15 C6 -11 6 -7 6.5 -3 Z" fill="#6f7f8a"/>
        </g>
      </g>`;
}

function vwBus() {
  // Little Miss Sunshine: the yellow-and-white VW camper, the family running
  // behind it to push-start it.
  const runner = (x, h, lean = 0) => `<g transform="translate(${x} 18) rotate(${lean})" fill="${C.ink}">
          <path d="M-1 ${-h * 0.4} L-4 0 M1 ${-h * 0.4} L3.5 -1.5" stroke="${C.ink}" stroke-width="1.3" stroke-linecap="round"/>
          <path d="M-2.2 ${-h * 0.4} L-1.8 ${-h * 0.85} L2.4 ${-h * 0.85} L2.6 ${-h * 0.4} Z"/>
          <circle cx="0.6" cy="${-h * 0.85 - 2.2}" r="2.1"/>
          <path d="M1.5 ${-h * 0.78} L6.5 ${-h * 0.62}" stroke="${C.ink}" stroke-width="1.2" stroke-linecap="round"/>
        </g>`;
  return `<g class="vehicle bus">
        ${runner(-20, 15, 14)}${runner(-11, 13, 16)}${runner(-28, 11, 12)}
        <g class="car-body">
          <path d="M0 15 L0 6 C0 2 2 0 6 0 L46 0 C52 0 56 3 57 8 L58 15 Z" fill="#f4c22f"/>
          <path d="M0 6 C0 2 2 0 6 0 L46 0 C51 0 54.5 2.5 56 6 Z" fill="#fbf6ea"/>
          <path d="M43 1.5 L50 1.5 C53 2 54.6 3.6 55.2 5.4 L43 5.4 Z" fill="#7aa9bd"/>
          <g fill="#7aa9bd">${[4, 13, 22, 31].map((x) => `<rect x="${x}" y="1.6" width="7" height="3.8" rx="0.8"/>`).join('')}</g>
          <path d="M56.5 7.5 L58 7.5 L58 15 L56.5 15 Z" fill="#e0ab1e"/>
          <circle cx="56.8" cy="10" r="1.3" fill="#fff8d0"/>
          <rect x="0" y="11.5" width="58" height="1.2" fill="#d9a51c"/>
          <circle cx="11" cy="15.5" r="3.6" fill="#1d1f24"/><circle cx="11" cy="15.5" r="1.4" fill="#e8e6e0"/>
          <circle cx="47" cy="15.5" r="3.6" fill="#1d1f24"/><circle cx="47" cy="15.5" r="1.4" fill="#e8e6e0"/>
        </g>
      </g>`;
}

function brideBike() {
  // Kill Bill: the Bride in her yellow suit with the black stripe, katana on
  // her back, on the yellow motorcycle.
  return `<g class="vehicle bike">
        <g class="car-body">
          <circle cx="6" cy="14.5" r="4" fill="#1d1f24"/><circle cx="6" cy="14.5" r="1.6" fill="#8a8f96"/>
          <circle cx="31" cy="14.5" r="4" fill="#1d1f24"/><circle cx="31" cy="14.5" r="1.6" fill="#8a8f96"/>
          <path d="M6 14 L14 8 L26 8 L31 14" stroke="#2a2a2a" stroke-width="1.6" fill="none"/>
          <path d="M11 9 C13 5 20 4 25 5 L33 7 C35 8 35 11 32 12 L22 12 Z" fill="#f2c31b"/>
          <path d="M26 6 L33 7.5 L31 10 Z" fill="#2b2b2b"/>
          <path d="M12 9 L5 8.5 L4 10.5 L11 11 Z" fill="#f2c31b"/>
          <path d="M14 -9 L20 -1" stroke="#2b2b2b" stroke-width="1.4" stroke-linecap="round"/>
          <path d="M13.5 -9.5 L12.5 -11" stroke="#8a6a3a" stroke-width="1.6" stroke-linecap="round"/>
          <path d="M14 8 L16 -4 C17 -7 21 -8 23 -6 L28 1 L26 2.5 L21 -2 L19 8 Z" fill="#f2c31b"/>
          <path d="M16.5 -3 L18.6 7.5" stroke="#1b1b1b" stroke-width="1.3"/>
          <path d="M16 8 L22 8 L24 12 L21 12 Z" fill="#f2c31b"/>
          <circle cx="20.5" cy="-9.5" r="3.4" fill="#f2c31b"/>
          <path d="M21 -10.5 L24 -10 L23.6 -8 L21 -8.4 Z" fill="#1b1b1b"/>
        </g>
      </g>`;
}

function warRig() {
  // Mad Max: Fury Road: the War Rig, flames from the stacks, dust storm behind.
  const dust = [[-40, 6, 14], [-62, 0, 18], [-88, 4, 16], [-112, -2, 20], [-140, 6, 15], [-74, -14, 13], [-104, -20, 15]]
    .map(([x, y, rr]) => `<circle cx="${x}" cy="${y}" r="${rr}"/>`)
    .join('');
  return `<g class="vehicle rig">
        <g class="dust" fill="#d9b98a" opacity="0.7">${dust}</g>
        <g class="car-body">
          <rect x="-6" y="7" width="58" height="5" fill="#2e2a27"/>
          <rect x="-4" y="-7" width="52" height="15" rx="7.5" fill="#9b8270"/>
          <rect x="-4" y="-7" width="52" height="5" rx="2.5" fill="#b9a18c" opacity="0.8"/>
          <rect x="-4" y="3" width="52" height="5" rx="2.5" fill="#6f5a4b" opacity="0.8"/>
          <g fill="#7a4a2e" opacity="0.85"><rect x="6" y="-7" width="3" height="15"/><rect x="22" y="-7" width="3" height="15"/><rect x="38" y="-7" width="3" height="15"/></g>
          <g fill="#b36a35" opacity="0.6"><circle cx="14" cy="1" r="3"/><circle cx="31" cy="-2" r="2.4"/><circle cx="44" cy="2" r="2"/></g>
          <g fill="#3a3330">${[0, 12, 28, 44].map((x) => `<path d="M${x} -7 L${x + 1.4} -11 L${x + 2.8} -7 Z"/>`).join('')}</g>
          <path d="M50 14 L50 -4 L60 -6 L66 0 L74 2 L76 14 Z" fill="#3a3a3a"/>
          <path d="M58 -3 L63 -3 L66 1 L58 1 Z" fill="#8a9aa8"/>
          <rect x="73" y="3" width="4" height="10" fill="#c9cdd2"/>
          <rect x="52" y="-14" width="2.2" height="11" fill="#b9bec4"/><rect x="56" y="-14" width="2.2" height="11" fill="#b9bec4"/>
          <path d="M66 0 L74 2 L76 8 L66 8 Z" fill="#2a2a2a"/>
          ${[2, 11, 36, 45, 57, 70].map((x) => `<circle cx="${x}" cy="14.8" r="4" fill="#1d1f24"/><circle cx="${x}" cy="14.8" r="1.4" fill="#6b6b6b"/>`).join('')}
        </g>
        <g class="flames"><path d="M53.1 -14 C50 -20 54 -24 53 -30 C57 -25 57 -19 53.1 -14 Z M57.1 -14 C54.5 -19 58 -22 57.5 -27 C61 -22 60.5 -18 57.1 -14 Z" fill="#ff8a2a"/><path d="M53.1 -15 C52 -18 54 -21 54 -24 C55.5 -21 55 -18 53.1 -15 Z" fill="#ffe08a"/></g>
      </g>`;
}

function cabin(x, y) {
  // The Cabin in the Woods: a little cabin in a dark clump of pines.
  const pine = (px, py, h, c) =>
    `<path d="M${px} ${py - h} L${px - h * 0.32} ${py - h * 0.45} L${px - h * 0.2} ${py - h * 0.45} L${px - h * 0.4} ${py} L${px + h * 0.4} ${py} L${px + h * 0.2} ${py - h * 0.45} L${px + h * 0.32} ${py - h * 0.45} Z" fill="${c}"/>`;
  return `<g>
        ${pine(x - 24, y + 2, 30, '#3f6a3a')}${pine(x + 22, y + 3, 34, '#365f33')}${pine(x - 13, y - 2, 26, '#4a7a42')}${pine(x + 32, y + 1, 24, '#3f6a3a')}
        <rect x="${x - 10}" y="${y - 11}" width="20" height="12" fill="#7a5236"/>
        <g stroke="#5f3f29" stroke-width="0.7">${[-8, -5, -2].map((d) => `<line x1="${x - 10}" y1="${y + d}" x2="${x + 10}" y2="${y + d}"/>`).join('')}</g>
        <path d="M${x - 13} ${y - 10} L${x} ${y - 20} L${x + 13} ${y - 10} Z" fill="#3e2c22"/>
        <rect x="${x + 5}" y="${y - 22}" width="3" height="7" fill="#5a4a40"/>
        <rect x="${x - 3}" y="${y - 6}" width="5" height="7" fill="#3a2618"/>
        <rect class="window" x="${x + 4}" y="${y - 8}" width="4" height="3.5" fill="#9cc6d6"/>
        ${pine(x + 12, y + 4, 18, '#2f5a2e')}
      </g>`;
}

function cabinSecret(x, y) {
  // ...and what's really underneath it: the grid of glowing cubes (night only).
  const cols = 5, rows = 2, c = 6.4;
  const cubes = [];
  const who = ['M-1.5 2.5 L-1.5 -1 L0 -2.5 L1.5 -1 L1.5 2.5 Z', 'M-2 2.5 C-2 -1 2 -1 2 2.5 Z', 'M0 -2.5 L2 2.5 L-2 2.5 Z', 'M-2.2 2.5 L-1 -1 L1 -1 L2.2 2.5 Z M-0.8 -2.6 L0.8 -2.6 L0.8 -1 L-0.8 -1 Z'];
  for (let i = 0; i < cols; i++)
    for (let j = 0; j < rows; j++) {
      const cx = x - (cols * c) / 2 + i * c + c / 2;
      const cy = y + j * c + c / 2;
      cubes.push(`<rect x="${r(cx - 2.7)}" y="${r(cy - 2.7)}" width="5.4" height="5.4" fill="${(i + j) % 3 ? '#7fe7ff' : '#ffd27a'}" opacity="0.2"/><path transform="translate(${r(cx)} ${r(cy)}) scale(0.75)" d="${who[(i * 3 + j) % who.length]}" fill="#0d1726" opacity="0.7"/>`);
    }
  return `<g class="cabin-secret">
        <rect x="${x - (cols * c) / 2 - 3}" y="${y - 3}" width="${cols * c + 6}" height="${rows * c + 6}" rx="2" fill="#0b1220" opacity="0.55"/>
        <path d="M${x} ${y - 3} L${x} ${y - 14}" stroke="#7fe7ff" stroke-width="0.8" opacity="0.5" stroke-dasharray="1.5 1.5"/>
        ${cubes.join('')}
      </g>`;
}

function shieldBench(x, y) {
  // The Avengers: an old man on a lakeside bench, the shield leaning beside him.
  return `<g transform="translate(${x} ${y})">
        <rect x="-14" y="-7" width="26" height="2.2" fill="#8a6a4a"/>
        <rect x="-14" y="-12" width="26" height="2" fill="#8a6a4a"/>
        <path d="M-12 -5 L-12 0 M10 -5 L10 0 M-12 -12 L-12 -7 M10 -12 L10 -7" stroke="#5f4530" stroke-width="1.4"/>
        <g fill="${C.ink}">
          <circle cx="-4" cy="-17.5" r="2.3" fill="#d9d4cc"/><circle cx="-4" cy="-17.2" r="2.3" fill="#c8c2b8" opacity="0.6"/>
          <path d="M-7 -15 L-1 -15 L0 -7 L-7.5 -7 Z" fill="#6b7a8c"/>
          <path d="M-1 -7.5 L5 -7.5 L5 -1 L3.6 -1 L3.6 -5.6 L-1 -5.6 Z" fill="#4a4f57"/>
        </g>
        <g transform="translate(18 -5.5)">
          <circle r="6.2" fill="#c7353a"/><circle r="4.7" fill="#f4f1ea"/><circle r="3.3" fill="#c7353a"/><circle r="2.1" fill="#2d5aa8"/>
          <path d="M0 -1.6 L0.45 -0.5 L1.6 -0.5 L0.7 0.2 L1 1.4 L0 0.7 L-1 1.4 L-0.7 0.2 L-1.6 -0.5 L-0.45 -0.5 Z" fill="#fff"/>
        </g>
      </g>`;
}

function wheatField(x0, x1, y) {
  // Gladiator: the golden wheat, and a man walking through it, hand trailing.
  const stalks = [];
  for (let x = x0; x <= x1; x += 2.6) {
    const edge = Math.min(x - x0, x1 - x) / 30;
    const h = 10 + Math.min(1, edge) * 8 + rand() * 3;
    const top = y - h + rand() * 2;
    stalks.push(`<path d="M${r(x)} ${y + 8} L${r(x + 1)} ${r(top)}" stroke="${rand() > 0.5 ? '#d9b44a' : '#c99d36'}" stroke-width="1"/><ellipse cx="${r(x + 1)}" cy="${r(top - 1.5)}" rx="1.1" ry="2.6" fill="#ebc65a"/>`);
  }
  const fx = x0 + (x1 - x0) * 0.55;
  return `<g>
        <path d="M${x0 - 10} ${y + 12} C${x0} ${y - 4} ${x1} ${y - 6} ${x1 + 14} ${y + 12} Z" fill="#d7b14a"/>
        ${stalks.join('')}
        <g transform="translate(${r(fx)} ${y + 2})" fill="#3e3128">
          <path d="M-4 -6 L-3.4 -20 L3.6 -20 L4.4 -6 Z" fill="#5a3d2a"/>
          <path d="M-3.6 -12 L4 -12 L4.4 -6 L-4 -6 Z" fill="#3e2a1e"/>
          <circle cx="0" cy="-22.8" r="2.7"/>
          <path d="M-3 -18 L-9.5 -9.5" stroke="#5a3d2a" stroke-width="1.8" stroke-linecap="round"/>
          <path d="M-9.5 -9.5 L-11.5 -8.8" stroke="#c99c7a" stroke-width="1.6" stroke-linecap="round"/>
        </g>
        ${stalks.filter((_, i) => i % 3 === 0).slice(Math.floor(stalks.length * 0.45 / 3), Math.floor(stalks.length * 0.62 / 3)).join('')}
      </g>`;
}

function fenceWithRat(x, y) {
  // The Departed: the rat on the railing.
  return `<g transform="translate(${x} ${y})">
        <g fill="#8a6a4a">${[0, 16, 32, 48].map((px) => `<rect x="${px - 1.2}" y="-14" width="2.4" height="14"/>`).join('')}</g>
        <rect x="-3" y="-12" width="54" height="1.8" fill="#9a7a58"/>
        <rect x="-3" y="-6" width="54" height="1.8" fill="#9a7a58"/>
        <g transform="translate(24 -12)" fill="#6d6560">
          <path d="M-4 0 C-4 -3.4 1 -4.4 3.5 -2.4 L6 -2 L5.5 -0.6 L3 0 Z"/>
          <circle cx="2.4" cy="-3.4" r="1.1"/>
          <path d="M-4 -0.5 C-8 0 -9 3 -12 3.5" stroke="#8a7e78" stroke-width="0.7" fill="none"/>
          <circle cx="5.2" cy="-1.6" r="0.4" fill="#111"/>
        </g>
      </g>`;
}

function gargantua(x, y) {
  // Interstellar: the black hole, its lensed ring of light (night only).
  return `<g class="gargantua" transform="translate(${x} ${y})">
        <defs><radialGradient id="ggGlow"><stop offset="0.35" stop-color="#ffd9a0" stop-opacity="0.45"/><stop offset="1" stop-color="#ffd9a0" stop-opacity="0"/></radialGradient></defs>
        <circle r="46" fill="url(#ggGlow)"/>
        <circle r="17.5" fill="none" stroke="#ffe7b8" stroke-width="3.2" opacity="0.9"/>
        <ellipse rx="44" ry="6" fill="none" stroke="#ffd18a" stroke-width="3.6" opacity="0.8"/>
        <circle r="14.5" fill="#05070c"/>
        <path d="M-44 0 A44 6 0 0 0 44 0" fill="none" stroke="#fff1cf" stroke-width="3" />
      </g>`;
}

function hills() {
  seed = 3;
  const far = curve([0, 176], [
    [[120, 158], [220, 146], [330, 152]],
    [[460, 160], [560, 140], [700, 146]],
    [[840, 152], [920, 132], [1060, 138]],
    [[1200, 144], [1300, 126], [1440, 132]],
    [[1520, 136], [1570, 140], [1600, 142]],
  ]);
  const mid = curve([0, 232], [
    [[120, 198], [260, 184], [420, 188]],
    [[560, 192], [640, 216], [760, 216]],
    [[820, 216], [846, 172], [884, 170]],
    [[922, 168], [950, 212], [1060, 214]],
    [[1160, 216], [1260, 200], [1360, 206]],
    [[1460, 212], [1530, 200], [1600, 206]],
  ]);
  const near = curve([0, 262], [
    [[200, 244], [380, 252], [560, 250]],
    [[760, 248], [900, 240], [1040, 242]],
    [[1200, 244], [1380, 256], [1600, 248]],
  ]);
  // The country road runs along the near hill.
  const roadTop = curve([-20, 252], [
    [[300, 246], [600, 254], [880, 250]],
    [[1160, 246], [1400, 256], [1620, 250]],
  ]);
  const roadBottom = curve([-20, 266], [
    [[300, 260], [600, 268], [880, 264]],
    [[1160, 260], [1400, 270], [1620, 264]],
  ]);
  const roadD = `${roadTop.d} L1620 264 C1400 270 1160 260 880 264 C600 268 300 260 -20 266 Z`;

  // Fellowship along the left ridge, heading for the mountains.
  const order = ['gandalf', 'aragorn', 'hobbit', 'sam', 'hobbit', 'hobbit', 'legolas', 'gimli', 'boromir'];
  const xs = [262, 284, 302, 315, 329, 342, 360, 380, 398];
  const fellowship = order.map((k, i) => walker(k, xs[i], mid.yAt(xs[i]) + 0.6)).join('');

  const yellowRoad = `M902 252 C930 240 960 234 990 228 C1010 224 1030 220 1040 214 L1047 214 C1040 221 1022 227 1000 233 C972 241 946 248 926 254 Z`;
  const bricks = `M914 253 C940 244 970 236 996 231 C1016 226 1034 220 1044 214`;
  const spiral = `M888 259 m-22 0 a22 5.2 0 1 0 44 0 a22 5.2 0 1 0 -44 0 M888 259 m-14 0 a14 3.3 0 1 0 28 0 a14 3.3 0 1 0 -28 0 M888 259 m-6 0 a6 1.4 0 1 0 12 0 a6 1.4 0 1 0 -12 0`;

  const fireflies = Array.from({ length: 14 }, () => {
    const x = 60 + rand() * 1480;
    const y = 230 + rand() * 110;
    return `<circle cx="${r(x)}" cy="${r(y)}" r="${r(1.4 + rand())}" style="animation-delay:${r(rand() * 3)}s"/>`;
  }).join('');

  return `<svg class="scenery-hills" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="midG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.midTop}"/><stop offset="0.5" stop-color="${C.midBottom}"/></linearGradient>
        <linearGradient id="nearG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.nearTop}"/><stop offset="0.6" stop-color="${C.nearBottom}"/></linearGradient>
        <filter id="paper" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" stitchTiles="stitch"/>
          <feColorMatrix values="0 0 0 0 0.25  0 0 0 0 0.18  0 0 0 0 0.1  0 0 0 0.16 0"/>
        </filter>
        <mask id="sceneMask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" style="mask-type:alpha"><use href="#sceneArt"/></mask>
      </defs>

      <g id="sceneArt">
      <!-- Distant range -->
      <path d="${far.d} L1600 ${H} L0 ${H} Z" fill="${C.far}"/>
      <!-- The Lord of the Rings: the Misty Mountains, where the Fellowship is headed -->
      ${mountains()}
      <!-- Close Encounters of the Third Kind: Devils Tower (the mothership arrives at night) -->
      ${devilsTower()}
      <!-- The Wizard of Oz: the Emerald City on the horizon -->
      ${emeraldCity(1046, 216)}
      <!-- Jurassic Park: brachiosaurs over the trees -->
      ${brachiosaur(1452, 226, 1.0)}
      ${brachiosaur(1318, 222, 0.68, true)}

      <!-- Middle ridge -->
      <path d="${mid.d} L1600 ${H} L0 ${H} Z" fill="url(#midG)"/>
      <path d="${mid.d}" fill="none" stroke="${C.ridge}" stroke-width="2" opacity="0.7"/>
      ${treeLine(470, 535, mid.yAt, { s: 0.62 })}
      <!-- The Cabin in the Woods -->
      ${cabin(580, r(mid.yAt(580) + 3))}
      ${treeLine(622, 650, mid.yAt, { s: 0.62 })}
      ${treeLine(1120, 1180, mid.yAt, { s: 0.6 })}
      ${treeLine(1336, 1580, mid.yAt, { s: 0.75, gap: 11 })}
      <!-- Jurassic Park: the gate -->
      ${jurassicGate(1384, mid.yAt(1384) + 4)}
      <!-- Field of Dreams -->
      <g transform="translate(1150 ${r(mid.yAt(1180) + 12)}) scale(1.35) translate(-1150 ${r(-(mid.yAt(1180) + 12))})">${fieldOfDreams(1150, mid.yAt(1180) + 12)}</g>
      <!-- The Sound of Music: spinning on the hilltop -->
      ${soundOfMusic(884, mid.yAt(884) + 0.8)}
      <!-- The Lord of the Rings: the Fellowship walking the ridge -->
      <g fill="${C.ink}">${fellowship}</g>

      <!-- Near hill, the country road and the yellow brick road -->
      <path d="${near.d} L1600 ${H} L0 ${H} Z" fill="url(#nearG)"/>
      <path d="${near.d}" fill="none" stroke="${C.ridge}" stroke-width="1.6" opacity="0.5"/>
      <path d="${yellowRoad}" fill="${C.brick}"/>
      <path d="${bricks}" fill="none" stroke="${C.brickLine}" stroke-width="1" stroke-dasharray="3 4" opacity="0.8"/>
      <path d="${roadD}" fill="${C.road}"/>
      <path d="${roadTop.d}" fill="none" stroke="${C.roadEdge}" stroke-width="1.2"/>
      <path d="${roadBottom.d}" fill="none" stroke="${C.roadEdge}" stroke-width="1.2"/>
      <path d="${spiral}" fill="none" stroke="${C.brick}" stroke-width="3"/>
      ${treeLine(-10, 120, near.yAt, { s: 1.05, gap: 18 })}
      ${treeLine(1470, 1610, near.yAt, { s: 1.05, gap: 18 })}
      <!-- My Neighbor Totoro: the bus stop -->
      ${busStop(826, 251)}
      <!-- Jaws -->
      ${jawsLake(270, 318)}
      <!-- The Avengers: the bench by the lake, the shield beside it -->
      ${shieldBench(414, 306)}
      <!-- Gladiator: the wheat field -->
      ${wheatField(1180, 1420, 304)}
      <!-- The Departed: the rat on the fence -->
      ${fenceWithRat(744, 250)}

      </g>
      <!-- Paper grain over the painting -->
      <rect width="${W}" height="${H}" filter="url(#paper)" mask="url(#sceneMask)"/>

      <!-- Night: moonlight over everything, then the lights -->
      <rect class="night-tint" width="${W}" height="${H}" mask="url(#sceneMask)"/>
      <!-- Back to the Future: driving through on the road (above the tint so the fire glows) -->
      <g class="drive drive-1">${delorean()}</g>
      <!-- Little Miss Sunshine, Kill Bill and Mad Max: Fury Road take their turns on the road -->
      <g class="drive drive-2">${vwBus()}</g>
      <g class="drive drive-3">${brideBike()}</g>
      <g class="drive drive-4">${warRig()}</g>
      <g class="night-lights">
        ${mothership()}
        ${gargantua(1236, 78)}
        ${cabinSecret(580, r(mid.yAt(580) + 16))}
        <ellipse class="glow-green" cx="1046" cy="176" rx="90" ry="62"/>
        <g opacity="0.62">${emeraldCity(1046, 216)}</g>
        <circle cx="1410" cy="${r(mid.yAt(1384) + 4 - 60)}" r="9" class="torch-glow"/>
        <circle cx="1358" cy="${r(mid.yAt(1384) + 4 - 60)}" r="9" class="torch-glow"/>
        <g class="lit-windows" fill="#ffd77a" transform="translate(1150 ${r(mid.yAt(1180) + 12)}) scale(1.35) translate(-1150 ${r(-(mid.yAt(1180) + 12))})">
          <rect x="1162.4" y="${r(mid.yAt(1180) + 12 - 4 - 22.8)}" width="3.2" height="3.2"/>
          <rect x="1154" y="${r(mid.yAt(1180) + 12 - 4 - 10.5)}" width="4" height="4.5"/>
          <rect x="1170" y="${r(mid.yAt(1180) + 12 - 4 - 10.5)}" width="4" height="4.5"/>
        </g>
        <circle class="staff-glow" cx="${262 - 8}" cy="${r(mid.yAt(262) + 0.6 - 36.5)}" r="2.2"/>
        <g class="fireflies">${fireflies}</g>
      </g>
    </svg>`;
}

// ---------- write into index.html ----------

function splice(html, name, content) {
  const start = `<!-- scenery:${name}:start -->`;
  const end = `<!-- scenery:${name}:end -->`;
  const a = html.indexOf(start);
  const b = html.indexOf(end);
  if (a < 0 || b < 0) throw new Error(`markers for ${name} not found in index.html`);
  return html.slice(0, a + start.length) + '\n    ' + content + '\n    ' + html.slice(b);
}

const sky = [twinSuns(), etMoon(), upHouse(), kiki()].join('\n    ');
let html = fs.readFileSync(INDEX, 'utf8');
html = splice(html, 'sky', sky);
html = splice(html, 'hills', hills());
fs.writeFileSync(INDEX, html);
console.log('Scenery written to', path.relative(process.cwd(), INDEX));
