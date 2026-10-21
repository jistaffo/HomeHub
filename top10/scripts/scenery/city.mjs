// The city scene: a painted skyline on a bay, full of film homages.
import { W, H, r, rand, setSeed, paintDefs, shadow, leafyTree, cumulus } from './lib.mjs';
import { delorean, vwBus, warRig, tumbler } from './vehicles.mjs';

const P = 'ct';
const STREET = 246; // where buildings meet the sidewalk
const BAY_X = 1080; // the bay opens up east of here
const BAY_Y = 222; // waterline in the bay

// ---------- buildings ----------

const lit = []; // window positions that may light up at night

function building(x, w, h, style, { roof = true } = {}) {
  const top = STREET - h;
  const styles = {
    brick: { face: '#b4694a', side: '#cf8460', pat: 'winBrick', cell: [10, 12], win: [3, 3, 4, 6] },
    stone: { face: '#d6cbb9', side: '#ebe2d2', pat: 'winStone', cell: [8, 10], win: [2, 2, 4, 6] },
    glass: { face: '#8ea9bf', side: '#b4cbdc', pat: 'winGlass', cell: [6, 7], win: [1, 1, 4, 5] },
    teal: { face: '#7fa6a0', side: '#a2c4bd', pat: 'winStone', cell: [8, 10], win: [2, 2, 4, 6] },
  };
  const st = styles[style];
  const side = Math.max(3, w * 0.18);
  const parts = [
    `<rect x="${r(x)}" y="${r(top)}" width="${r(w)}" height="${h}" fill="${st.face}"/>`,
    `<rect x="${r(x + w - side)}" y="${r(top)}" width="${r(side)}" height="${h}" fill="${st.side}" opacity="0.75"/>`,
    `<rect x="${r(x + 2)}" y="${r(top + 4)}" width="${r(w - 4)}" height="${h - 8}" fill="url(#${P}-${st.pat})"/>`,
    `<rect x="${r(x - 1)}" y="${r(top - 2)}" width="${r(w + 2)}" height="2.4" fill="${st.side}"/>`,
  ];
  if (roof && style === 'brick' && w > 22) {
    const tx = x + w * 0.3;
    parts.push(`<g transform="translate(${r(tx)} ${r(top - 2)})"><path d="M-1 0 L-1 -6 M7 0 L7 -6" stroke="#5a4636" stroke-width="1"/><rect x="-2.5" y="-14" width="11" height="9" rx="1.5" fill="#8a6a50"/><path d="M-3 -14 L3 -18 L9 -14 Z" fill="#6b5240"/></g>`);
  }
  if (roof && style === 'glass') parts.push(`<path d="M${r(x + w * 0.6)} ${r(top - 2)} L${r(x + w * 0.6)} ${r(top - 16)}" stroke="#5a6470" stroke-width="1.2"/>`);
  // Remember the window cells so some light up at night.
  const [cw, ch] = st.cell;
  const [wx, wy, ww, wh] = st.win;
  for (let gx = Math.ceil((x + 2) / cw) * cw; gx + wx + ww < x + w - 2; gx += cw)
    for (let gy = Math.ceil((top + 4) / ch) * ch; gy + wy + wh < STREET - 4; gy += ch)
      if (rand() < 0.28) lit.push([gx + wx, gy + wy, ww, wh]);
  return parts.join('');
}

function skyline(x0, x1, base, minH, maxH, fill, seed) {
  // Hazy towers across the bay.
  setSeed(seed);
  const out = [];
  for (let x = x0; x < x1; ) {
    const w = 16 + rand() * 26;
    const h = minH + rand() * (maxH - minH);
    out.push(`<rect x="${r(x)}" y="${r(base - h)}" width="${r(w)}" height="${r(h + 40)}" fill="${fill}"/>`);
    if (rand() < 0.3) out.push(`<rect x="${r(x + w / 2 - 0.6)}" y="${r(base - h - 10)}" width="1.2" height="10" fill="${fill}"/>`);
    x += w - 2 + rand() * 6;
  }
  return out.join('');
}

// ---------- landmarks ----------

function bruges(x) {
  // In Bruges: stepped-gable houses around the Belfry.
  const houses = [
    [-110, 26, 44, '#e2c48a'],
    [-84, 22, 52, '#c8734f'],
    [-62, 24, 40, '#f1ebdf'],
    [22, 24, 48, '#d99c6a'],
    [46, 22, 38, '#9c4f3a'],
    [68, 26, 46, '#e8dcc4'],
  ];
  const gable = (hx, hw, hh, c) => {
    const top = STREET - hh;
    const st = hw / 6;
    const steps = `M${hx} ${STREET} L${hx} ${top} L${hx + st} ${top} L${hx + st} ${top - 5} L${hx + 2 * st} ${top - 5} L${hx + 2 * st} ${top - 10} L${hx + 4 * st} ${top - 10} L${hx + 4 * st} ${top - 5} L${hx + 5 * st} ${top - 5} L${hx + 5 * st} ${top} L${hx + hw} ${top} L${hx + hw} ${STREET} Z`;
    const wins = [];
    for (let row = 0; row < 3; row++)
      for (let col = 0; col < 2; col++) {
        const wx = hx + hw * 0.22 + col * hw * 0.36;
        const wy = top + 4 + row * 11;
        if (wy + 7 < STREET - 6) {
          wins.push(`<rect x="${r(wx)}" y="${r(wy)}" width="${r(hw * 0.2)}" height="7" fill="#4a5a66" opacity="0.75"/>`);
          if (rand() < 0.45) lit.push([wx, wy, hw * 0.2, 7]);
        }
      }
    return `<path d="${steps}" fill="${c}"/><path d="${steps}" fill="none" stroke="#6a4a3a" stroke-width="0.6" opacity="0.5"/>${wins.join('')}`;
  };
  const bx = x - 14;
  return `<g>
        ${houses.slice(0, 3).map(([dx, w, h, c]) => gable(x + dx, w, h, c)).join('')}
        <rect x="${bx}" y="118" width="28" height="${STREET - 118}" fill="#b06f4c"/>
        <rect x="${bx + 20}" y="118" width="8" height="${STREET - 118}" fill="#c98762"/>
        <g fill="#8e5538">${[0, 1, 2, 3].map((i) => `<rect x="${bx + 5 + i * 5}" y="160" width="2.6" height="${STREET - 160 - 6}"/>`).join('')}</g>
        <circle cx="${x}" cy="140" r="6.5" fill="#f4ecd8" stroke="#6a4a3a" stroke-width="1"/>
        <path d="M${x} 140 L${x} 136 M${x} 140 L${x + 3} 141" stroke="#3a2a22" stroke-width="0.8"/>
        <g fill="#9a5c40"><rect x="${bx - 2}" y="112" width="5" height="10"/><rect x="${bx + 25}" y="112" width="5" height="10"/></g>
        <path d="M${bx - 2} 112 L${bx + 0.5} 106 L${bx + 3} 112 Z M${bx + 25} 112 L${bx + 27.5} 106 L${bx + 30} 112 Z" fill="#6b5a4e"/>
        <path d="M${x - 9} 118 L${x - 9} 90 L${x - 5} 86 L${x + 5} 86 L${x + 9} 90 L${x + 9} 118 Z" fill="#b8784f"/>
        <path d="M${x + 3} 86 L${x + 5} 86 L${x + 9} 90 L${x + 9} 118 L${x + 3} 118 Z" fill="#d0916a"/>
        <g fill="#3e3a44">${[-6, -1, 4].map((d) => `<path d="M${x + d} 112 L${x + d} 98 C${x + d} 95 ${x + d + 3} 95 ${x + d + 3} 98 L${x + d + 3} 112 Z"/>`).join('')}</g>
        <path d="M${x - 5} 86 L${x} 74 L${x + 5} 86 Z" fill="#6b5a4e"/>
        <path d="M${x} 74 L${x} 64" stroke="#3e3a44" stroke-width="1"/><path d="M${x} 65 L${x + 6} 67 L${x} 69 Z" fill="#c7353a"/>
        ${houses.slice(3).map(([dx, w, h, c]) => gable(x + dx, w, h, c)).join('')}
      </g>`;
}

function battersea(x) {
  // Children of Men: Battersea Power Station, the pig floating between its chimneys.
  const chimney = (cx) => `<g>
        <path d="M${cx - 5} 186 L${cx - 4} 104 L${cx + 4} 104 L${cx + 5} 186 Z" fill="#efe8dc"/>
        <path d="M${cx + 1.5} 104 L${cx + 4} 104 L${cx + 5} 186 L${cx + 1.5} 186 Z" fill="#fffaf0"/>
        <g stroke="#cfc6b6" stroke-width="0.7">${[-2.5, -0.5, 1.5].map((d) => `<path d="M${cx + d} 106 L${cx + d * 1.2} 184"/>`).join('')}</g>
        <rect x="${cx - 5.5}" y="172" width="11" height="6" fill="#d8cfbf"/>
      </g>`;
  return `<g>
        ${chimney(x + 6)}${chimney(x + 120)}
        <rect x="${x}" y="182" width="132" height="${STREET - 182}" fill="#a5603f"/>
        <rect x="${x + 100}" y="182" width="32" height="${STREET - 182}" fill="#bd7450"/>
        <g fill="#8a4c33">${Array.from({ length: 11 }, (_, i) => `<rect x="${x + 6 + i * 11}" y="192" width="3" height="${STREET - 200}"/>`).join('')}</g>
        <rect x="${x - 2}" y="180" width="136" height="4" fill="#c88a68"/>
        ${chimney(x + 16)}${chimney(x + 130)}
        <path d="M${x + 66} 182 Q${x + 70} 150 ${x + 66} 124" stroke="#6b5a50" stroke-width="0.6" fill="none"/>
        <g class="pig" transform="translate(${x + 66} 116) rotate(-6)">
          <ellipse rx="15" ry="8" fill="#f2a6b8"/>
          <ellipse cx="2" cy="-3" rx="10" ry="3.5" fill="#f9c6d2" opacity="0.8"/>
          <ellipse cx="-15.5" cy="0.5" rx="3.2" ry="3.6" fill="#e98aa2"/>
          <circle cx="-16.6" cy="0" r="0.6" fill="#a24a62"/><circle cx="-16.4" cy="1.6" r="0.6" fill="#a24a62"/>
          <path d="M-10 -6.5 L-12.5 -12 L-6.5 -7.5 Z M-5 -7.5 L-5.5 -13 L-1 -8 Z" fill="#e98aa2"/>
          <circle cx="-11" cy="-2.4" r="0.8" fill="#3a2a2a"/>
          <g fill="#e98aa2"><rect x="-9" y="6" width="3" height="5" rx="1"/><rect x="-3" y="7" width="3" height="5" rx="1"/><rect x="4" y="7" width="3" height="5" rx="1"/><rect x="9" y="6" width="3" height="5" rx="1"/></g>
          <path d="M15 -1 C19 -3 19 2 16 1" stroke="#e98aa2" stroke-width="1.2" fill="none"/>
        </g>
      </g>`;
}

function winchester(x) {
  // Shaun of the Dead: the Winchester, and the dead shambling past.
  const zombie = (zx, lean, arm) => `<g transform="translate(${zx} ${STREET + 3}) rotate(${lean})" fill="#4a5a4e">
        <path d="M-1 -6 L-2.5 0 M1 -6 L2.6 0" stroke="#3e4a40" stroke-width="1.3" stroke-linecap="round"/>
        <path d="M-2.4 -6 L-2 -14 L2.6 -14 L2.8 -6 Z" fill="#6b6f5e"/>
        <circle cx="0" cy="-16.2" r="2.2" fill="#9bab8e"/>
        <path d="M-1 -12.5 L${-6 - arm} -11.5 M0 -11.5 L${-5 - arm} -10" stroke="#9bab8e" stroke-width="1.1" stroke-linecap="round"/>
      </g>`;
  return `<g>
        <rect x="${x}" y="196" width="66" height="${STREET - 196}" fill="#9a5a40"/>
        <rect x="${x + 52}" y="196" width="14" height="${STREET - 196}" fill="#b06a4c"/>
        <g fill="#4a5a66" opacity="0.8">${[8, 24, 40].map((dx) => `<rect x="${x + dx}" y="202" width="9" height="9"/>`).join('')}</g>
        <path d="M${x - 2} 196 L${x + 33} 184 L${x + 68} 196 Z" fill="#5a4a46"/>
        <rect x="${x - 1}" y="216" width="68" height="30" fill="#24402f"/>
        <rect x="${x - 2}" y="216" width="70" height="6" fill="#1c3325"/>
        <text x="${x + 33}" y="220.6" font-family="Georgia, serif" font-size="3.8" font-weight="700" fill="#e8c46a" text-anchor="middle" letter-spacing="0.4">THE WINCHESTER</text>
        <rect class="window" x="${x + 4}" y="225" width="18" height="12" fill="#e8b45a" opacity="0.85"/>
        <rect class="window" x="${x + 44}" y="225" width="18" height="12" fill="#e8b45a" opacity="0.85"/>
        <g stroke="#1c3325" stroke-width="0.8"><path d="M${x + 13} 225 L${x + 13} 237 M${x + 53} 225 L${x + 53} 237 M${x + 4} 231 L${x + 22} 231 M${x + 44} 231 L${x + 62} 231"/></g>
        <rect x="${x + 27}" y="226" width="12" height="20" fill="#3a2a22"/>
        <circle cx="${x + 36}" cy="236" r="0.8" fill="#e8c46a"/>
        <path d="M${x + 66} 214 L${x + 76} 214" stroke="#2a2a2a" stroke-width="1"/>
        <rect x="${x + 70}" y="214" width="9" height="11" fill="#24402f" stroke="#e8c46a" stroke-width="0.6"/>
        <path d="M${x + 72.5} 217 L${x + 73.5} 222 L${x + 74.5} 219 L${x + 75.5} 222 L${x + 76.5} 217" stroke="#e8c46a" stroke-width="0.6" fill="none"/>
        ${zombie(x - 22, 6, 1)}${zombie(x - 12, -4, 2)}${zombie(x + 82, 8, 0)}${zombie(x + 94, -6, 2)}
        <g transform="translate(${x + 30} ${STREET + 3})">
          <path d="M-1 -6 L-2 0 M1 -6 L2 0" stroke="#2a2a2a" stroke-width="1.2" stroke-linecap="round"/>
          <path d="M-2.6 -6 L-2.2 -14 L2.6 -14 L2.8 -6 Z" fill="#f2efe8"/>
          <path d="M-0.4 -14 L0.4 -14 L0.6 -9 L-0.2 -9 Z" fill="#b8323a"/>
          <circle cx="0" cy="-16.3" r="2.2" fill="#e2b896"/>
          <path d="M2.4 -11.5 L7 -20" stroke="#c9a46a" stroke-width="2" stroke-linecap="round"/>
        </g>
        <g transform="translate(${x + 40} ${STREET + 3})">
          <path d="M-1 -6 L-2 0 M1 -6 L2 0" stroke="#2a2a2a" stroke-width="1.3" stroke-linecap="round"/>
          <path d="M-3.4 -6 L-3 -14 L3.4 -14 L3.6 -6 Z" fill="#3a3a3a"/>
          <circle cx="0" cy="-16.3" r="2.4" fill="#e2b896"/>
        </g>
      </g>`;
}

function artDecoKong(x) {
  // A stepped Art Deco skyscraper, and on its mast the great ape (King Kong),
  // with biplanes circling.
  const tiers = [
    [56, 150],
    [44, 116],
    [32, 92],
    [20, 74],
    [12, 62],
  ];
  const parts = tiers
    .map(([w, top], i) => {
      const bottom = i ? tiers[i - 1][1] : STREET;
      return `<rect x="${x - w / 2}" y="${top}" width="${w}" height="${bottom - top}" fill="#d9d0c2"/>
        <rect x="${x + w / 2 - w * 0.22}" y="${top}" width="${w * 0.22}" height="${bottom - top}" fill="#eee7db"/>
        <g stroke="#b9ae9c" stroke-width="0.8">${Array.from({ length: Math.floor(w / 5) }, (_, k) => `<path d="M${r(x - w / 2 + 3 + k * 5)} ${top + 3} L${r(x - w / 2 + 3 + k * 5)} ${bottom - 2}"/>`).join('')}</g>`;
    })
    .join('');
  for (let gy = 154; gy < STREET - 6; gy += 9) for (let gx = x - 25; gx < x + 24; gx += 5) if (rand() < 0.25) lit.push([gx + 0.6, gy, 2, 5]);
  return `<g>
        ${parts}
        <path d="M${x - 3} 62 L${x - 2} 40 L${x + 2} 40 L${x + 3} 62 Z" fill="#c9bfae"/>
        <path d="M${x} 40 L${x} 18" stroke="#8a8478" stroke-width="1.6"/>
        <g transform="translate(${x - 2} 50)" fill="#2c2420">
          <path d="M-12 8 C-15 0 -13 -8 -7 -11 C-3 -13 1 -12 2 -8 L3 -2 C4 2 2 7 -1 9 L-2 14 L-6 14 L-6 10 C-8 11 -10 13 -11 16 L-15 16 C-14 13 -13 10 -12 8 Z"/>
          <circle cx="-5" cy="-13" r="3.6"/>
          <path d="M-1 -9 C2 -14 3 -22 1 -28 L4 -29 C6 -22 5 -13 1 -6 Z"/>
          <path d="M-11 -5 C-16 -2 -19 3 -20 8 L-17 9 C-16 4 -13 0 -9 -2 Z"/>
        </g>
        <g class="biplanes" fill="#3a3a3a">
          <g transform="translate(${x - 44} 46)"><rect x="-7" y="-0.6" width="14" height="1.2"/><rect x="-6" y="-3.6" width="12" height="1" /><rect x="-1" y="-3" width="9" height="2.6" rx="1"/><path d="M8 -2 L11 -4 L11 0 Z"/><path d="M-1 -1.6 L-2.4 -4.6 M-1 -1.6 L-2.4 1.6" stroke="#3a3a3a" stroke-width="0.6"/></g>
          <g transform="translate(${x + 38} 30) scale(-0.85 0.85)"><rect x="-7" y="-0.6" width="14" height="1.2"/><rect x="-6" y="-3.6" width="12" height="1" /><rect x="-1" y="-3" width="9" height="2.6" rx="1"/><path d="M8 -2 L11 -4 L11 0 Z"/></g>
        </g>
      </g>`;
}

function spidey(ax, ay, len) {
  // Spider-Man swinging on his line (the group rocks from the anchor).
  return `<g class="swing" style="transform-origin:${ax}px ${ay}px">
        <path d="M${ax} ${ay} L${ax} ${ay + len}" stroke="#f4f4f4" stroke-width="0.9"/>
        <g transform="translate(${ax} ${ay + len}) rotate(-25)">
          <path d="M-0.6 0 L-1.5 -1.5" stroke="#c4232e" stroke-width="1.6" stroke-linecap="round"/>
          <circle cx="0" cy="3" r="2.3" fill="#c4232e"/>
          <path d="M-0.9 4 L-0.4 5 M0.9 4 L0.4 5" stroke="#f4f4f4" stroke-width="0.6"/>
          <path d="M-2 5 L2 5 L2.4 12 L-2.4 12 Z" fill="#c4232e"/>
          <path d="M-2.2 8 L2.2 8 L2.4 12 L-2.4 12 Z" fill="#2d4fa3"/>
          <path d="M-1.6 12 L-4.6 18 L-2.6 19 L0 13 M1.6 12 L4 15 L7 13.5 L7.6 15 L3.6 17.4 L0.6 13" fill="#2d4fa3"/>
          <path d="M2 6 L6.5 9" stroke="#c4232e" stroke-width="1.5" stroke-linecap="round"/>
        </g>
      </g>`;
}

function batSignal(sx, sy, cx, cy) {
  // The Dark Knight: the searchlight on its roof (day), the signal on the clouds (night).
  return {
    lamp: `<g transform="translate(${sx} ${sy})"><rect x="-1" y="-3" width="2" height="3" fill="#4a4a4a"/><path d="M-4 -3 L4 -3 L5.5 -10 L-1.5 -10 Z" fill="#6b6b6b" transform="rotate(14)"/></g>`,
    light: `<g class="bat-signal">
        <path d="M${sx - 1} ${sy - 9} L${sx + 4} ${sy - 9} L${cx + 26} ${cy + 6} L${cx - 22} ${cy + 10} Z" fill="#fff6c8" opacity="0.16"/>
        <ellipse cx="${cx}" cy="${cy}" rx="27" ry="15" fill="#fff3b8" opacity="0.85"/>
        <path transform="translate(${cx} ${cy + 1})" d="M0 -5.5 L1.2 -8 L2 -4.8 C5 -5.5 9 -6 14 -4.5 C12 -2.5 11.5 0 12.5 2.5 C9.5 1.2 7.5 2 6.2 4 C4.4 2.4 2.3 2.6 0 5.5 C-2.3 2.6 -4.4 2.4 -6.2 4 C-7.5 2 -9.5 1.2 -12.5 2.5 C-11.5 0 -12 -2.5 -14 -4.5 C-9 -6 -5 -5.5 -2 -4.8 L-1.2 -8 Z" fill="#1a1a1a"/>
      </g>`,
  };
}

function godzilla(x, y) {
  // Godzilla rising from the bay, plates along his back.
  const body = `M${x - 28} ${y} C${x - 30} ${y - 26} ${x - 28} ${y - 50} ${x - 20} ${y - 68} C${x - 18} ${y - 78} ${x - 20} ${y - 86} ${x - 24} ${y - 92} C${x - 28} ${y - 96} ${x - 36} ${y - 98} ${x - 42} ${y - 102} L${x - 44} ${y - 108} C${x - 36} ${y - 112} ${x - 24} ${y - 114} ${x - 14} ${y - 110} C${x - 4} ${y - 106} ${x + 2} ${y - 96} ${x + 6} ${y - 84} C${x + 18} ${y - 66} ${x + 30} ${y - 36} ${x + 36} ${y} Z`;
  const back = [];
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const bx = x - 8 + t * 40;
    const by = y - 102 + t * 96;
    const s = 6 + Math.sin(t * Math.PI) * 7;
    back.push(`M${r(bx - s * 0.5)} ${r(by + s * 0.2)} L${r(bx + s * 0.75)} ${r(by - s * 0.6)} L${r(bx + s * 0.35)} ${r(by + s * 0.5)} Z`);
  }
  return {
    body: `<g>
        <path d="${back.join(' ')}" fill="#56645e"/>
        <path d="${body}" fill="#3e4a45"/>
        <path d="M${x - 14} ${y - 110} C${x - 4} ${y - 106} ${x + 2} ${y - 96} ${x + 6} ${y - 84} C${x + 18} ${y - 66} ${x + 30} ${y - 36} ${x + 36} ${y} L${x + 24} ${y} C${x + 18} ${y - 40} ${x + 8} ${y - 70} ${x - 2} ${y - 90} Z" fill="#4f5d57"/>
        <path d="M${x - 24} ${y - 60} C${x - 32} ${y - 56} ${x - 38} ${y - 50} ${x - 40} ${y - 44} L${x - 36} ${y - 42} C${x - 33} ${y - 48} ${x - 28} ${y - 52} ${x - 20} ${y - 54} Z" fill="#3e4a45"/>
        <circle cx="${x - 30}" cy="${y - 104}" r="1.3" fill="#e9e2c8"/>
        <path d="M${x + 44} ${y} C${x + 60} ${y - 10} ${x + 76} ${y - 14} ${x + 92} ${y - 26} C${x + 88} ${y - 12} ${x + 72} ${y - 2} ${x + 56} ${y + 2} Z" fill="#3e4a45"/>
        <g fill="#cfe3ec" opacity="0.8"><path d="M${x - 34} ${y} q8 -3 16 0 M${x + 26} ${y} q8 -3 16 0 M${x + 50} ${y} q8 -3 16 0" stroke="#e8f4f8" stroke-width="1.2" fill="none"/></g>
      </g>`,
    glow: `<g class="atomic"><path d="${back.join(' ')}" fill="#8fe2ff"/><circle cx="${x - 30}" cy="${y - 104}" r="1.6" fill="#d8f6ff"/></g>`,
  };
}

function mothership(x, y) {
  // District 9: the vast ship hanging over the city, debris dangling below.
  const dangles = [];
  for (let i = 0; i < 14; i++) {
    const dx = x - 110 + rand() * 220;
    const len = 8 + rand() * 26;
    dangles.push(`<path d="M${r(dx)} ${r(y + 14 + Math.abs(dx - x) * -0.04 + 6)} l${r((rand() - 0.5) * 3)} ${r(len)}" stroke="#6b6662" stroke-width="${r(0.6 + rand() * 0.8)}"/>`);
  }
  return `<g class="d9-ship" opacity="0.92">
        ${dangles.join('')}
        <path d="M${x - 150} ${y} C${x - 110} ${y - 14} ${x + 110} ${y - 16} ${x + 150} ${y - 2} C${x + 140} ${y + 8} ${x + 100} ${y + 14} ${x} ${y + 16} C${x - 100} ${y + 14} ${x - 140} ${y + 9} ${x - 150} ${y} Z" fill="#8f8a86"/>
        <path d="M${x - 150} ${y} C${x - 110} ${y - 14} ${x + 110} ${y - 16} ${x + 150} ${y - 2} C${x + 100} ${y - 6} ${x - 100} ${y - 6} ${x - 150} ${y} Z" fill="#aaa5a0"/>
        <path d="M${x - 112} ${y + 10} C${x - 60} ${y + 24} ${x + 60} ${y + 24} ${x + 112} ${y + 10} C${x + 70} ${y + 16} ${x - 70} ${y + 16} ${x - 112} ${y + 10} Z" fill="#6e6a68"/>
        <path d="M${x - 30} ${y + 18} C${x - 22} ${y + 32} ${x + 22} ${y + 32} ${x + 30} ${y + 18} Z" fill="#5f5b59"/>
        <g stroke="#7a7572" stroke-width="0.8" opacity="0.8">${Array.from({ length: 12 }, (_, i) => `<path d="M${x - 130 + i * 23} ${y - 4} L${x - 128 + i * 23} ${y + 10}"/>`).join('')}</g>
      </g>`;
}

function haystackAndShip(rx, sx) {
  // The Goonies: the pirate ship sailing out past Haystack Rock.
  return `<g>
        <path d="M${rx - 34} ${BAY_Y + 2} C${rx - 32} ${BAY_Y - 26} ${rx - 20} ${BAY_Y - 50} ${rx} ${BAY_Y - 58} C${rx + 18} ${BAY_Y - 60} ${rx + 30} ${BAY_Y - 40} ${rx + 34} ${BAY_Y - 18} L${rx + 38} ${BAY_Y + 2} Z" fill="#5f574f"/>
        <path d="M${rx} ${BAY_Y - 58} C${rx + 18} ${BAY_Y - 60} ${rx + 30} ${BAY_Y - 40} ${rx + 34} ${BAY_Y - 18} L${rx + 38} ${BAY_Y + 2} L${rx + 12} ${BAY_Y + 2} C${rx + 14} ${BAY_Y - 24} ${rx + 10} ${BAY_Y - 44} ${rx} ${BAY_Y - 58} Z" fill="#776d63"/>
        <path d="M${rx - 18} ${BAY_Y - 48} C${rx - 8} ${BAY_Y - 58} ${rx + 12} ${BAY_Y - 60} ${rx + 22} ${BAY_Y - 50} C${rx + 10} ${BAY_Y - 52} ${rx - 6} ${BAY_Y - 50} ${rx - 18} ${BAY_Y - 48} Z" fill="#6f8f5a"/>
        <path d="M${rx + 44} ${BAY_Y + 2} L${rx + 46} ${BAY_Y - 18} L${rx + 50} ${BAY_Y - 22} L${rx + 53} ${BAY_Y + 2} Z M${rx + 56} ${BAY_Y + 2} L${rx + 58} ${BAY_Y - 10} L${rx + 61} ${BAY_Y + 2} Z" fill="#5f574f"/>
        <g fill="#fff" opacity="0.8"><circle cx="${rx - 6}" cy="${BAY_Y - 30}" r="0.8"/><circle cx="${rx + 8}" cy="${BAY_Y - 40}" r="0.8"/><circle cx="${rx + 16}" cy="${BAY_Y - 22}" r="0.8"/></g>
        <g transform="translate(${sx} ${BAY_Y})">
          <path d="M-30 -2 L30 -2 L26 6 L-24 6 Z" fill="#4a3226"/>
          <path d="M18 -2 L30 -2 L30 -10 L20 -10 Z" fill="#5a3e2e"/>
          <path d="M-30 -2 L-22 -2 L-22 -8 L-30 -6 Z" fill="#5a3e2e"/>
          <g stroke="#3a2a20" stroke-width="1"><path d="M-12 -2 L-12 -40 M4 -2 L4 -46 M18 -10 L18 -34"/></g>
          <g fill="#e8e0cc">
            <path d="M-20 -36 L-4 -36 L-5 -24 L-19 -24 Z"/><path d="M-19 -22 L-5 -22 L-6 -10 L-18 -10 Z"/>
            <path d="M-5 -42 L13 -42 L12 -30 L-4 -30 Z"/><path d="M-4 -28 L12 -28 L11 -14 L-3 -14 Z"/>
            <path d="M12 -31 L24 -31 L23 -20 L13 -20 Z"/>
          </g>
          <path d="M4 -46 L11 -44 L4 -42 Z" fill="#1a1a1a"/>
          <circle cx="6.2" cy="-44" r="0.6" fill="#f4f4f4"/>
        </g>
      </g>`;
}

function streetLamp(x) {
  return `<g><rect x="${x - 0.6}" y="${STREET - 26}" width="1.2" height="26" fill="#3a3f48"/><path d="M${x - 3.4} ${STREET - 26} L${x + 3.4} ${STREET - 26} L${x + 2} ${STREET - 30} L${x - 2} ${STREET - 30} Z" fill="#3a3f48"/><rect x="${x - 2}" y="${STREET - 26}" width="4" height="2" fill="#f2e2b0"/></g>`;
}

// ---------- the scene ----------

function blueLeaves(x) {
  // Kill Bill: the House of Blue Leaves, a two-storey Tokyo teahouse with
  // upswept tiled roofs, paper screens and a row of blue lanterns (they glow
  // at night).
  const roof = (x0, x1, y, h) => `<path d="M${x0 - 4} ${y - 2.6} C${x0} ${y - 0.4} ${x0 + 4} ${y} ${x0 + 8} ${y} L${x1 - 8} ${y} C${x1 - 4} ${y} ${x1} ${y - 0.4} ${x1 + 4} ${y - 2.6} L${x1 - 6} ${y - h} L${x0 + 6} ${y - h} Z" fill="#4c5a6c"/>
        <path d="M${x0 - 4} ${y - 2.6} C${x0} ${y - 0.4} ${x0 + 4} ${y} ${x0 + 8} ${y} L${x1 - 8} ${y} C${x1 - 4} ${y} ${x1} ${y - 0.4} ${x1 + 4} ${y - 2.6}" stroke="#2f3946" stroke-width="1" fill="none"/>
        <g stroke="#3d4858" stroke-width="0.4">${Array.from({ length: Math.floor((x1 - x0 - 8) / 2.4) }, (_, i) => `<path d="M${r(x0 + 6 + i * 2.4)} ${y - h + 0.6} L${r(x0 + 5 + i * 2.4)} ${y - 0.6}"/>`).join('')}</g>`;
  const screens = (x0, x1, y0, y1) => `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="#3b2a24"/>
        <g fill="#efe6cf">${Array.from({ length: Math.floor((x1 - x0 - 1) / 5) }, (_, i) => `<rect class="shoji" x="${x0 + 1 + i * 5}" y="${y0 + 1.2}" width="4" height="${y1 - y0 - 2.4}"/>`).join('')}</g>
        <g stroke="#3b2a24" stroke-width="0.3">${Array.from({ length: Math.floor((x1 - x0 - 1) / 5) }, (_, i) => `<path d="M${x0 + 3 + i * 5} ${y0 + 1.2} v${y1 - y0 - 2.4} M${x0 + 1 + i * 5} ${(y0 + y1) / 2} h4"/>`).join('')}</g>`;
  const lanterns = [6, 13, 20, 27, 34, 41].map((dx) => `<g transform="translate(${x + dx} 225)"><path d="M0 -1.6 V0" stroke="#2f3946" stroke-width="0.4"/><ellipse cx="0" cy="2" rx="1.7" ry="2.2" fill="#3d72c4"/><path d="M-1 0.2 h2 M-1 3.8 h2" stroke="#1f3b6a" stroke-width="0.5"/></g>`).join('');
  const body = `<g>
        <rect x="${x - 1}" y="${STREET - 3}" width="${48}" height="3" fill="#8f8a80"/>
        ${screens(x, x + 46, 227, STREET - 3)}
        <rect x="${x + 19}" y="231" width="8" height="${STREET - 234}" fill="#2a1d18"/>
        <path d="M${x + 18.6} 231 h8.8 v5 h-8.8 Z" fill="#2f5aa8"/>
        <path d="M${x + 21.5} 231 v5 M${x + 24.5} 231 v5" stroke="#1f3b6a" stroke-width="0.5"/>
        ${roof(x, x + 46, 227, 6)}
        ${lanterns}
        ${screens(x + 6, x + 40, 207, 221)}
        ${roof(x + 4, x + 42, 207, 9)}
        <rect x="${x + 42}" y="204" width="4.4" height="16" fill="#2a1d18"/>
        <g fill="#e8d7b0" font-family="Georgia, serif" font-size="2.6" text-anchor="middle">${['青', '葉', '屋'].map((c, i) => `<text x="${x + 44.2}" y="${208.6 + i * 4}">${c}</text>`).join('')}</g>
      </g>`;
  const glow = `<g class="blue-leaves-glow"><rect x="${x + 1}" y="228" width="44" height="${STREET - 232}" fill="#9cc4ff" opacity="0.45"/><rect x="${x + 7}" y="208" width="32" height="12" fill="#9cc4ff" opacity="0.45"/>${[6, 13, 20, 27, 34, 41].map((dx) => `<circle cx="${x + dx}" cy="227" r="3.2" fill="#7fb2ff"/>`).join('')}</g>`;
  return { body, glow };
}

export function city() {
  lit.length = 0;
  setSeed(21);
  const far = skyline(0, 1620, 214, 30, 110, '#c7d2dc', 5);
  const farNear = skyline(0, 1620, 222, 16, 70, '#b7c4cf', 6);
  setSeed(31);

  // Downtown blocks, front row last so it overlaps.
  const back = [];
  const blocks = [
    [640, 30, 104, 'glass'],
    [672, 36, 132, 'stone'],
    [818, 34, 150, 'glass'],
    [852, 30, 118, 'teal'],
    [884, 40, 124, 'brick'],
    [930, 46, 146, 'glass'],
    [978, 40, 112, 'stone'],
    [1020, 44, 96, 'brick'],
  ];
  for (const [x, w, h, st] of blocks) back.push(building(x, w, h, st));
  const front = [
    [528, 26, 62, 'brick'],
    [700, 30, 70, 'teal'],
    [800, 28, 58, 'brick'],
    [1000, 34, 66, 'brick'],
  ].map(([x, w, h, st]) => building(x, w, h, st));
  const deco = artDecoKong(760);
  const old = bruges(262);
  const bps = battersea(388);
  const pub = winchester(566);
  const hobl = blueLeaves(1036);
  const bat = batSignal(696, STREET - 104, 700, 40);
  const gz = godzilla(1206, BAY_Y + 2);

  const lamps = [110, 220, 330, 460, 640, 790, 940, 1090, 1240, 1390, 1530].map(streetLamp).join('');
  const trees = [176, 402, 712, 864, 1014].map((x, i) => leafyTree(P, x, STREET + 2, 0.55, i)).join('');

  setSeed(77);
  const farDots = Array.from({ length: 220 }, () => `<rect x="${r(rand() * 1600)}" y="${r(168 + rand() * 46)}" width="1.4" height="1.6"/>`).join('');
  const litWindows = lit.map(([x, y, w, h]) => `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(h)}"/>`).join('');
  const lampGlows = [110, 220, 330, 460, 640, 790, 940, 1090, 1240, 1390, 1530]
    .map((x) => `<circle cx="${x}" cy="${STREET - 25}" r="7" class="lamp-glow"/><ellipse cx="${x}" cy="${STREET + 2}" rx="12" ry="3" class="lamp-pool"/>`)
    .join('');

  return `<svg class="scenery-hills scene-city" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        ${paintDefs(P)}
        <pattern id="${P}-winBrick" width="10" height="12" patternUnits="userSpaceOnUse"><rect x="3" y="3" width="4" height="6" fill="#4b3a36" opacity="0.6"/></pattern>
        <pattern id="${P}-winStone" width="8" height="10" patternUnits="userSpaceOnUse"><rect x="2" y="2" width="4" height="6" fill="#56636e" opacity="0.55"/></pattern>
        <pattern id="${P}-winGlass" width="6" height="7" patternUnits="userSpaceOnUse"><rect x="1" y="1" width="4" height="5" fill="#dfeaf2" opacity="0.35"/><rect x="0" y="6" width="6" height="1" fill="#5d7488" opacity="0.4"/></pattern>
        <linearGradient id="${P}-bay" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9cde0"/><stop offset="1" stop-color="#7fb0cb"/></linearGradient>
        <linearGradient id="${P}-river" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9cc6dc"/><stop offset="1" stop-color="#6f9fbd"/></linearGradient>
        <radialGradient id="${P}-sun" cx="0.85" cy="0" r="0.8"><stop offset="0" stop-color="#fff0c2" stop-opacity="0.7"/><stop offset="1" stop-color="#fff0c2" stop-opacity="0"/></radialGradient>
        <mask id="${P}-sceneMask" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" style="mask-type:alpha"><use href="#${P}-sceneArt"/></mask>
      </defs>

      <g id="${P}-sceneArt">
      <!-- Sky -->
      ${cumulus(P, 300, 58, 120, 0.92)}${cumulus(P, 700, 48, 150, 0.95)}${cumulus(P, 1470, 44, 110, 0.88)}
      <!-- District 9: the mothership over the city -->
      ${mothership(1250, 70)}
      <!-- The far shore, across the bay -->
      <g filter="url(#${P}-paint)">${far}${farNear}</g>
      <!-- The bay -->
      <rect x="${BAY_X - 20}" y="${BAY_Y}" width="${W - BAY_X + 20}" height="${H - BAY_Y}" fill="url(#${P}-bay)"/>
      <g stroke="#e8f4fa" stroke-width="1" opacity="0.6" stroke-linecap="round">${Array.from({ length: 16 }, (_, i) => `<path d="M${r(BAY_X + 20 + ((i * 97) % 500))} ${r(BAY_Y + 6 + ((i * 7) % 20))} h${8 + (i % 4) * 4}"/>`).join('')}</g>
      <!-- The Goonies: the ship sailing out past Haystack Rock -->
      ${haystackAndShip(1404, 1316)}
      <!-- Godzilla, rising from the bay -->
      ${gz.body}

      <!-- Downtown -->
      ${back.join('')}
      <!-- King Kong on the Art Deco tower -->
      ${deco}
      ${bat.lamp}
      <!-- Spider-Man, swinging between the towers -->
      ${spidey(930, 102, 66)}
      ${front.join('')}
      <!-- In Bruges: the Belfry over the old town -->
      ${old}
      <!-- Children of Men: Battersea, and the pig -->
      ${bps}
      <!-- Shaun of the Dead: the Winchester -->
      ${pub}
      <!-- Kill Bill: the House of Blue Leaves -->
      ${hobl.body}

      <!-- The street and the road -->
      <rect x="0" y="${STREET - 2}" width="${BAY_X}" height="8" fill="#cfc8bc"/>
      ${trees}${lamps}
      <rect x="0" y="250" width="${W}" height="16" fill="#6c707a"/>
      <path d="M0 258 H${W}" stroke="#f1e6b8" stroke-width="1" stroke-dasharray="10 9"/>
      <rect x="0" y="249" width="${W}" height="1.6" fill="#a9a59c"/>
      <g fill="#8a8f98">${Array.from({ length: 26 }, (_, i) => `<rect x="${BAY_X + 6 + i * 20}" y="${BAY_Y + 12}" width="1.6" height="16"/>`).join('')}</g>
      <rect x="${BAY_X}" y="${BAY_Y + 12}" width="${W - BAY_X}" height="1.6" fill="#8a8f98"/>
      <!-- River embankment -->
      <rect x="0" y="266" width="${W}" height="12" fill="#b9b2a6"/>
      <g stroke="#9d968a" stroke-width="0.7">${Array.from({ length: 80 }, (_, i) => `<path d="M${i * 20 + (i % 2) * 10} 266 v12"/>`).join('')}<path d="M0 272 H${W}"/></g>
      <rect x="0" y="278" width="${W}" height="${H - 278}" fill="url(#${P}-river)"/>
      <g stroke="#e8f4fa" stroke-width="1" opacity="0.5" stroke-linecap="round">${Array.from({ length: 30 }, (_, i) => `<path d="M${(i * 131) % 1600} ${290 + ((i * 17) % 80)} h${10 + (i % 5) * 5}"/>`).join('')}</g>
      </g>

      <rect width="${W}" height="${H}" filter="url(#${P}-paper)" mask="url(#${P}-sceneMask)"/>
      <rect class="day-light" width="${W}" height="${H}" fill="url(#${P}-sun)" mask="url(#${P}-sceneMask)" style="mix-blend-mode:soft-light"/>

      <!-- Night -->
      <rect class="night-tint" width="${W}" height="${H}" mask="url(#${P}-sceneMask)"/>
      <g class="night-lights">
        <g class="lit-windows" fill="#ffd77a">${litWindows}</g>
        <g fill="#ffe2a0" opacity="0.55">${farDots}</g>
        ${lampGlows}
        ${bat.light}
        ${gz.glow}
        ${hobl.glow}
        <circle cx="760" cy="18" r="1.8" class="beacon"/>
        <g class="d9-lights" fill="#ff7a6a">${[1150, 1210, 1290, 1350].map((x) => `<circle cx="${x}" cy="${r(82 + (x % 3))}" r="1.2"/>`).join('')}</g>
        <circle cx="262" cy="140" r="6" fill="#ffe7a8" opacity="0.8"/>
      </g>
      <!-- The road parade (The Dark Knight's Tumbler joins in the city) -->
      <g class="drive drive-1">${delorean(P)}</g>
      <g class="drive drive-2">${vwBus()}</g>
      <g class="drive drive-4">${warRig()}</g>
      <g class="drive drive-5">${tumbler()}</g>
    </svg>`;
}

// Mothra, flying in the left margin of the city sky.
export function citySky() {
  return `<svg class="art art-left art-mothra scene-city-only" viewBox="0 0 140 100">
      <g transform="translate(70 50)">
        <path d="M-4 -4 C-24 -34 -60 -40 -66 -18 C-70 -4 -44 4 -6 2 Z" fill="#e9973a"/>
        <path d="M-6 2 C-40 6 -58 22 -48 34 C-38 44 -16 30 -4 6 Z" fill="#d4772e"/>
        <path d="M4 -4 C24 -34 60 -40 66 -18 C70 -4 44 4 6 2 Z" fill="#e9973a"/>
        <path d="M6 2 C40 6 58 22 48 34 C38 44 16 30 4 6 Z" fill="#d4772e"/>
        <g fill="#f6d25a"><path d="M-12 -6 C-26 -22 -50 -28 -56 -16 C-58 -8 -40 -4 -12 -6 Z M12 -6 C26 -22 50 -28 56 -16 C58 -8 40 -4 12 -6 Z"/></g>
        <g fill="#7a3b1e"><circle cx="-40" cy="-16" r="7"/><circle cx="40" cy="-16" r="7"/><circle cx="-34" cy="22" r="5"/><circle cx="34" cy="22" r="5"/></g>
        <g fill="#5fc4e6"><circle cx="-40" cy="-16" r="3.6"/><circle cx="40" cy="-16" r="3.6"/><circle cx="-34" cy="22" r="2.5"/><circle cx="34" cy="22" r="2.5"/></g>
        <path d="M-60 -20 C-48 -30 -30 -32 -16 -24 M60 -20 C48 -30 30 -32 16 -24" stroke="#fbe7b0" stroke-width="1.4" fill="none" opacity="0.8"/>
        <ellipse cx="0" cy="4" rx="5" ry="16" fill="#8a5a3a"/>
        <ellipse cx="0" cy="-12" rx="5.5" ry="5" fill="#a87a4e"/>
        <g stroke="#a87a4e" stroke-width="1.2" fill="none"><path d="M-2 -16 C-6 -24 -10 -26 -14 -26 M2 -16 C6 -24 10 -26 14 -26"/></g>
        <circle cx="-2.4" cy="-13" r="1.4" fill="#5fc4e6"/><circle cx="2.4" cy="-13" r="1.4" fill="#5fc4e6"/>
        <g stroke="#6b4a2e" stroke-width="0.8">${[-8, -2, 4, 10, 16].map((y) => `<path d="M-4.6 ${y} H4.6"/>`).join('')}</g>
      </g>
    </svg>`;
}
