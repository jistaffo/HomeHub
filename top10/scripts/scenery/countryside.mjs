import { W, H, r, curve, rand, setSeed, C, paintDefs, shadow, leafyTree, cumulus, flowers, tufts } from './lib.mjs';
import { delorean, vwBus, brideBike, warRig } from './vehicles.mjs';

function mountains() {
  // Faceted peaks lit from the right (where the suns are): gradient faces,
  // secondary ridge lines, and shaded snowcaps.
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
      const ridges = `M${s(0.04, 0.3)} L${s(0.22, 0.62)} L${s(0.3, 1)} M${s(-0.05, 0.32)} L${s(-0.2, 0.7)} L${s(-0.34, 1)} M${s(0.5, 0.5)} L${s(0.62, 1)}`;
      return `<path d="${shade}" fill="url(#cs-mtnShade)"/><path d="${lit}" fill="url(#cs-mtnLit)"/>
        <path d="${ridges}" fill="none" stroke="#e9f0ec" stroke-width="1.1" opacity="0.45"/>
        <path d="${snowL}" fill="${C.snowShade}"/><path d="${snowR}" fill="${C.snow}"/>`;
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
          <linearGradient id="cs-beamCE" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2c9" stop-opacity="0.55"/><stop offset="1" stop-color="#fff2c9" stop-opacity="0"/></linearGradient>
          <radialGradient id="cs-shipGlow"><stop offset="0" stop-color="#fff0c0" stop-opacity="0.6"/><stop offset="1" stop-color="#fff0c0" stop-opacity="0"/></radialGradient>
        </defs>
        <ellipse cx="704" cy="84" rx="120" ry="44" fill="url(#cs-shipGlow)"/>
        <path d="M676 92 L732 92 L748 120 L660 120 Z" fill="url(#cs-beamCE)"/>
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

export function tree(x, y, s = 1, kind = 0) {
  return leafyTree('cs', x, y, s * 0.92, kind);
}

export function treeLine(x0, x1, yAt, { s = 0.7, gap = 13, jitter = 3 } = {}) {
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
        <defs><linearGradient id="cs-lake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.water}"/><stop offset="1" stop-color="${C.waterDeep}"/></linearGradient></defs>
        <ellipse cx="${x}" cy="${y}" rx="112" ry="17" fill="url(#cs-lake)"/>
        <path d="M${x - 108} ${y - 4} Q${x} ${y - 13} ${x + 108} ${y - 4} Q${x} ${y - 9} ${x - 108} ${y - 4} Z" fill="#4f7f45" opacity="0.35"/>
        <ellipse cx="${x}" cy="${y - 1}" rx="104" ry="13" fill="none" stroke="#fff" stroke-width="0.8" opacity="0.35"/>
        <g stroke="#fff" stroke-width="1" stroke-linecap="round" opacity="0.55">${[[-60, 4, 10], [-24, 8, 14], [30, 2, 9], [62, 7, 12]].map(([dx, dy, w]) => `<path d="M${x + dx} ${y + dy} h${w}"/>`).join('')}</g>
        <g stroke="#5f7d3a" stroke-width="1.1" stroke-linecap="round">${[96, 100, 103, 106, 92, -96, -100, -92].map((dx, i) => `<path d="M${x + dx} ${y + 4} Q${x + dx + (i % 2 ? 2 : -2)} ${y - 6} ${x + dx + (i % 2 ? 3 : -3)} ${y - 12 + (i % 3)}"/>`).join('')}</g>
        <g fill="#8a5a36">${[98, 104, -98].map((dx) => `<ellipse cx="${x + dx + 2}" cy="${y - 11}" rx="1" ry="2.6"/>`).join('')}</g>
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
        <defs><radialGradient id="cs-ggGlow"><stop offset="0.35" stop-color="#ffd9a0" stop-opacity="0.45"/><stop offset="1" stop-color="#ffd9a0" stop-opacity="0"/></radialGradient></defs>
        <circle r="46" fill="url(#cs-ggGlow)"/>
        <circle r="17.5" fill="none" stroke="#ffe7b8" stroke-width="3.2" opacity="0.9"/>
        <ellipse rx="44" ry="6" fill="none" stroke="#ffd18a" stroke-width="3.6" opacity="0.8"/>
        <circle r="14.5" fill="#05070c"/>
        <path d="M-44 0 A44 6 0 0 0 44 0" fill="none" stroke="#fff1cf" stroke-width="3" />
      </g>`;
}

function patchwork(x0, x1, yAt, depth = 26) {
  // Farm fields: soft patches following the slope, with curved crop rows.
  const fills = ['#b4d48d', '#c9dc95', '#bcd88f', '#d9d593'];
  const out = [];
  let x = x0;
  let i = 0;
  while (x < x1) {
    const w = 40 + rand() * 30;
    const xa = x;
    const xb = Math.min(x1, x + w);
    const ya = yAt(xa) + 9;
    const yb = yAt(xb) + 9;
    const quad = `M${r(xa)} ${r(ya)} L${r(xb)} ${r(yb)} L${r(xb + 5)} ${r(yb + depth)} L${r(xa + 5)} ${r(ya + depth)} Z`;
    out.push(`<path d="${quad}" fill="${fills[i % fills.length]}" opacity="0.8"/>`);
    const rows = [];
    for (let k = 1; k < 6; k++) {
      const t = k / 6;
      rows.push(`M${r(xa + 5 * t + 2)} ${r(ya + depth * t)} L${r(xb + 5 * t - 2)} ${r(yb + depth * t)}`);
    }
    out.push(`<path d="${rows.join(' ')}" stroke="${i % 2 ? '#9cbf74' : '#c2b866'}" stroke-width="0.9" opacity="0.6" fill="none"/>`);
    x = xb + 3;
    i++;
  }
  return `<g>${out.join('')}</g>`;
}

function kodama(x, y, s = 1, tilt = 0) {
  // Princess Mononoke: a little white forest spirit, head cocked.
  return `<g transform="translate(${r(x)} ${r(y)}) scale(${s})" class="kodama">
        <path d="M-2.4 0 C-2.8 -3 -2.6 -6 -1.8 -7.5 L1.8 -7.5 C2.6 -6 2.8 -3 2.4 0 Z" fill="#f4f6f2"/>
        <path d="M-1.8 -5 L-3.6 -3.2 M1.8 -5 L3.6 -3.6" stroke="#f4f6f2" stroke-width="0.9" stroke-linecap="round"/>
        <g transform="translate(0 -10.5) rotate(${tilt})">
          <ellipse rx="4.2" ry="3.7" fill="#f7f8f4"/>
          <circle cx="-1.5" cy="-0.6" r="0.75" fill="#151515"/><circle cx="1.5" cy="-0.6" r="0.75" fill="#151515"/><circle cx="0" cy="1.5" r="0.7" fill="#151515"/>
        </g>
      </g>`;
}

function nightwalker(x, y) {
  // Princess Mononoke: the Nightwalker striding behind the mountains at night,
  // translucent and dotted with light, fading out below.
  const dots = [];
  for (let i = 0; i < 46; i++) dots.push(`<circle cx="${r(x - 26 + rand() * 52)}" cy="${r(y + 30 + rand() * 120)}" r="${r(0.7 + rand() * 1.1)}"/>`);
  return `<g class="nightwalker">
        <defs><linearGradient id="cs-nwFade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe3ff" stop-opacity="0.42"/><stop offset="0.65" stop-color="#9fc9ff" stop-opacity="0.22"/><stop offset="1" stop-color="#9fc9ff" stop-opacity="0"/></linearGradient></defs>
        <path d="M${x - 9} ${y + 18} C${x - 14} ${y + 4} ${x - 9} ${y - 10} ${x} ${y - 12} C${x + 9} ${y - 10} ${x + 14} ${y + 4} ${x + 9} ${y + 18}
                 C${x + 22} ${y + 34} ${x + 30} ${y + 70} ${x + 40} ${y + 120} L${x + 34} ${y + 122} C${x + 26} ${y + 84} ${x + 20} ${y + 56} ${x + 14} ${y + 44}
                 C${x + 16} ${y + 90} ${x + 14} ${y + 140} ${x + 12} ${y + 190} L${x - 12} ${y + 190} C${x - 14} ${y + 140} ${x - 16} ${y + 90} ${x - 14} ${y + 44}
                 C${x - 20} ${y + 56} ${x - 26} ${y + 84} ${x - 34} ${y + 122} L${x - 40} ${y + 120} C${x - 30} ${y + 70} ${x - 22} ${y + 34} ${x - 9} ${y + 18} Z" fill="url(#cs-nwFade)"/>
        <path d="M${x - 8} ${y - 8} C${x - 18} ${y - 22} ${x - 16} ${y - 34} ${x - 10} ${y - 40} M${x + 8} ${y - 8} C${x + 18} ${y - 22} ${x + 16} ${y - 34} ${x + 10} ${y - 40} M${x - 4} ${y - 12} C${x - 6} ${y - 24} ${x - 2} ${y - 30} ${x} ${y - 36}" fill="none" stroke="#cfe8ff" stroke-width="1.4" opacity="0.4"/>
        <ellipse cx="${x}" cy="${y + 2}" rx="7" ry="8" fill="none" stroke="#e8f4ff" stroke-width="1" opacity="0.55"/>
        <g fill="#f2fbff" opacity="0.7">${dots.join('')}</g>
      </g>`;
}

function darkCrystal(x, y) {
  // The Dark Crystal: the castle of spires on its crag, the crystal at its heart.
  const spires = [[-16, 26, 3.2], [-9, 40, 3.6], [-2, 30, 3], [5, 52, 4], [12, 34, 3.2], [19, 22, 2.8]];
  return `<g>
        <path d="M${x - 40} ${y + 70} C${x - 30} ${y + 40} ${x - 24} ${y + 14} ${x - 20} ${y} L${x + 24} ${y} C${x + 28} ${y + 16} ${x + 34} ${y + 44} ${x + 44} ${y + 70} Z" fill="#7d7488"/>
        <path d="M${x + 4} ${y} L${x + 24} ${y} C${x + 28} ${y + 16} ${x + 34} ${y + 44} ${x + 44} ${y + 70} L${x + 10} ${y + 70} C${x + 12} ${y + 40} ${x + 8} ${y + 18} ${x + 4} ${y} Z" fill="#958ba0"/>
        <path d="M${x - 22} ${y + 2} L${x + 26} ${y + 2} L${x + 22} ${y - 10} L${x - 18} ${y - 10} Z" fill="#4a4058"/>
        ${spires.map(([dx, h, w]) => `<path d="M${x + dx - w} ${y - 8} L${x + dx} ${y - 8 - h} L${x + dx + w} ${y - 8} Z" fill="#3b3348"/><path d="M${x + dx} ${y - 8 - h} L${x + dx + w} ${y - 8} L${x + dx + w * 0.3} ${y - 8} Z" fill="#5b5070"/>`).join('')}
        <path d="M${x + 5} ${y - 58} L${x + 7.5} ${y - 66} L${x + 10} ${y - 58} L${x + 7.5} ${y - 52} Z" fill="#d9cfff"/>
      </g>`;
}

function crystalBeam(x, y) {
  return `<g class="crystal-beam">
        <path d="M${x + 6.5} ${y - 66} L${x + 8.5} ${y - 66} L${x + 14} ${y - 200} L${x + 1} ${y - 200} Z" fill="#e6dcff" opacity="0.35"/>
        <circle cx="${x + 7.5}" cy="${y - 60}" r="6" fill="#efe8ff" opacity="0.9" filter="url(#cs-soft)"/>
      </g>`;
}

export function countryside() {
  setSeed(3);
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

  const far2 = curve([0, 162], [
    [[160, 140], [260, 120], [380, 128]],
    [[520, 136], [640, 112], [780, 120]],
    [[920, 128], [1000, 106], [1140, 114]],
    [[1280, 122], [1380, 104], [1600, 116]],
  ]);
  const kodamas = [[158, 302, 1.2, -14], [172, 305, 1.0, 10], [186, 299, 1.15, -6], [140, 314, 1.05, 16], [204, 300, 0.95, -18], [120, 318, 1.1, 8]];

  return `<svg class="scenery-hills scene-country" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        ${paintDefs('cs')}
        <linearGradient id="cs-midG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.midTop}"/><stop offset="0.5" stop-color="${C.midBottom}"/></linearGradient>
        <linearGradient id="cs-nearG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.nearTop}"/><stop offset="0.6" stop-color="${C.nearBottom}"/></linearGradient>
        <linearGradient id="cs-mtnLit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d3e2dc"/><stop offset="1" stop-color="#b3c9c3"/></linearGradient>
        <linearGradient id="cs-mtnShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a5bdb7"/><stop offset="1" stop-color="#93aca7"/></linearGradient>
        <linearGradient id="cs-haze" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1f4ec" stop-opacity="0"/><stop offset="1" stop-color="#f1f4ec" stop-opacity="0.75"/></linearGradient>
        <radialGradient id="cs-sun" cx="0.85" cy="0" r="0.8"><stop offset="0" stop-color="#fff0c2" stop-opacity="0.75"/><stop offset="1" stop-color="#fff0c2" stop-opacity="0"/></radialGradient>
        <mask id="cs-sceneMask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" style="mask-type:alpha"><use href="#cs-sceneArt"/></mask>
      </defs>

      <g id="cs-sceneArt">
      <!-- Sky: painted clouds over the far hills -->
      ${cumulus('cs', 250, 62, 130, 0.95)}${cumulus('cs', 610, 46, 90, 0.85)}${cumulus('cs', 1010, 44, 140, 0.92)}${cumulus('cs', 1340, 56, 100, 0.88)}

      <g filter="url(#cs-paint)">
        <!-- The farthest range, then the distant hills -->
        <path d="${far2.d} L1630 162 L1630 ${H + 30} L-30 ${H + 30} L-30 162 Z" fill="#d5e3e0"/>
        <path d="${far.d} L1630 142 L1630 ${H + 30} L-30 ${H + 30} L-30 176 Z" fill="${C.far}"/>
        <g fill="#b2c8c2">${Array.from({ length: 16 }, () => { const cx = 620 + rand() * 960; const n = 3 + Math.floor(rand() * 5); return Array.from({ length: n }, (_, k) => { const x = cx + k * 3.4 + rand() * 2; return `<circle cx="${r(x)}" cy="${r(far.yAt(x) + 2.5 + rand() * 2)}" r="${r(1.8 + rand() * 1.4)}"/>`; }).join(''); }).join('')}</g>
        <!-- The Lord of the Rings: the Misty Mountains, where the Fellowship is headed -->
        ${mountains()}
        <rect x="0" y="150" width="${W}" height="66" fill="url(#cs-haze)"/>
      </g>
      <!-- The Dark Crystal: the castle on its crag -->
      ${darkCrystal(526, 146)}
      <!-- Close Encounters of the Third Kind: Devils Tower (the mothership arrives at night) -->
      ${devilsTower()}
      <!-- The Wizard of Oz: the Emerald City on the horizon -->
      ${emeraldCity(1046, 216)}
      <!-- Jurassic Park: brachiosaurs over the trees -->
      ${brachiosaur(1452, 226, 1.0)}
      ${brachiosaur(1318, 222, 0.68, true)}

      <!-- Middle ridge, its farm fields, and the trees -->
      <g filter="url(#cs-paint)">
        <path d="${mid.d} L1630 206 L1630 ${H + 30} L-30 ${H + 30} L-30 232 Z" fill="url(#cs-midG)"/>
      </g>
      ${patchwork(660, 780, mid.yAt, 22)}${patchwork(940, 1120, mid.yAt, 24)}
      <path d="${mid.d}" fill="none" stroke="${C.ridge}" stroke-width="2.2" opacity="0.8"/>
      ${tufts(0, 1600, mid.yAt, 90, 34)}
      ${[200, 236, 440, 690, 742, 930, 1012, 1236, 1290].map((x, i) => tree(x, mid.yAt(x) + 14 + (i % 3) * 7, 0.34, i)).join('')}
      ${treeLine(470, 535, mid.yAt, { s: 0.62 })}
      <!-- The Cabin in the Woods -->
      ${cabin(580, r(mid.yAt(580) + 3))}
      ${treeLine(622, 650, mid.yAt, { s: 0.62 })}
      ${treeLine(1120, 1180, mid.yAt, { s: 0.6 })}
      ${treeLine(1336, 1580, mid.yAt, { s: 0.75, gap: 11 })}
      <!-- Jurassic Park: the gate -->
      ${shadow('cs', 1384, mid.yAt(1384) + 4, 36, 4)}
      ${jurassicGate(1384, mid.yAt(1384) + 4)}
      <!-- Field of Dreams -->
      <g transform="translate(1150 ${r(mid.yAt(1180) + 12)}) scale(1.35) translate(-1150 ${r(-(mid.yAt(1180) + 12))})">${shadow('cs', 1164, mid.yAt(1180) + 11, 20, 3)}${fieldOfDreams(1150, mid.yAt(1180) + 12)}</g>
      <!-- The Sound of Music: spinning on the hilltop -->
      ${soundOfMusic(884, mid.yAt(884) + 0.8)}
      <!-- The Lord of the Rings: the Fellowship walking the ridge -->
      <g fill="${C.ink}">${fellowship}</g>

      <!-- Near hill, the country road and the yellow brick road -->
      <g filter="url(#cs-paint)">
        <path d="${near.d} L1630 248 L1630 ${H + 30} L-30 ${H + 30} L-30 262 Z" fill="url(#cs-nearG)"/>
      </g>
      <path d="${near.d}" fill="none" stroke="${C.ridge}" stroke-width="1.6" opacity="0.55"/>
      <path d="${yellowRoad}" fill="${C.brick}"/>
      <path d="${bricks}" fill="none" stroke="${C.brickLine}" stroke-width="1" stroke-dasharray="3 4" opacity="0.8"/>
      <path d="${roadD}" fill="${C.road}"/>
      <path d="${roadTop.d}" fill="none" stroke="${C.roadEdge}" stroke-width="1.2"/>
      <path d="${roadBottom.d}" fill="none" stroke="${C.roadEdge}" stroke-width="1.2"/>
      <g fill="none" stroke="#cbb383" stroke-width="0.8" opacity="0.7" stroke-dasharray="14 9">
        <path d="M-20 256.5 C300 250.5 600 258.5 880 254.5 C1160 250.5 1400 260.5 1620 254.5"/>
        <path d="M-20 261.5 C300 255.5 600 263.5 880 259.5 C1160 255.5 1400 265.5 1620 259.5"/>
      </g>
      <path d="${spiral}" fill="none" stroke="${C.brick}" stroke-width="3"/>
      ${tufts(0, 1600, near.yAt, 140, 90, '#4a7a35')}
      ${flowers(160, 760, near.yAt, 22, 40)}${flowers(1040, 1180, near.yAt, 8, 30)}${flowers(1420, 1600, near.yAt, 10, 50)}
      <!-- Princess Mononoke: the forest edge, and its kodama -->
      ${treeLine(-30, 120, near.yAt, { s: 1.45, gap: 20, jitter: 10 })}
      ${tree(150, 300, 1.35, 1)}${tree(196, 296, 1.15, 0)}${tree(128, 312, 1.25, 2)}
      ${treeLine(1470, 1610, near.yAt, { s: 1.15, gap: 18 })}
      <!-- My Neighbor Totoro: the bus stop -->
      ${busStop(826, 251)}
      <!-- Jaws -->
      ${jawsLake(270, 318)}
      <!-- The Avengers: the bench by the lake, the shield beside it -->
      ${shadow('cs', 418, 306, 18, 2.6)}
      ${shieldBench(414, 306)}
      <!-- Gladiator: the wheat field -->
      ${wheatField(1180, 1420, 304)}
      <!-- The Departed: the rat on the fence -->
      ${fenceWithRat(744, 250)}
      </g>

      <!-- Paper grain, and the afternoon sun washing in from the right -->
      <rect width="${W}" height="${H}" filter="url(#cs-paper)" mask="url(#cs-sceneMask)"/>
      <rect class="day-light" width="${W}" height="${H}" fill="url(#cs-sun)" mask="url(#cs-sceneMask)" style="mix-blend-mode:soft-light"/>

      <!-- Night: moonlight over everything, then the lights -->
      <rect class="night-tint" width="${W}" height="${H}" mask="url(#cs-sceneMask)"/>
      <g class="night-lights">${nightwalker(334, 30)}</g>
      <!-- Princess Mononoke: kodama in the roots (they glow at night) -->
      <g class="kodamas">${kodamas.map(([x, y, sc, t]) => kodama(x, y, sc, t)).join('')}</g>
      <!-- Back to the Future: driving through on the road (above the tint so the fire glows) -->
      <g class="drive drive-1">${delorean('cs')}</g>
      <!-- Little Miss Sunshine, Kill Bill and Mad Max: Fury Road take their turns on the road -->
      <g class="drive drive-2">${vwBus()}</g>
      <g class="drive drive-3">${brideBike()}</g>
      <g class="drive drive-4">${warRig()}</g>
      <g class="night-lights">
        ${mothership()}
        ${gargantua(1236, 78)}
        ${crystalBeam(526, 146)}
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
