// Shared drawing helpers and palette for the scenery.
export const W = 1600;
export const H = 380;
export const r = (n) => Math.round(n * 10) / 10;

// Point on a cubic bezier, and y on a path made of consecutive cubic segments.
function bez(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}
export function curve(start, segs) {
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
export const setSeed = (s) => (seed = s);
export const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

export const C = {
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

// ---------- painterly helpers ----------

// Shared <defs>: a hand-painted wobble for landscape edges, a fine paper
// grain, a soft blur for shadows and glows, and a grass-stroke texture.
export function paintDefs(p) {
  return `<filter id="${p}-paint" x="-2%" y="-5%" width="104%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="9" result="n"/>
          <feDisplacementMap in="SourceGraphic" in2="n" scale="4.5" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
        <filter id="${p}-paper" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" stitchTiles="stitch"/>
          <feColorMatrix values="0 0 0 0 0.25  0 0 0 0 0.18  0 0 0 0 0.1  0 0 0 0.14 0"/>
        </filter>
        <filter id="${p}-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter>
        <filter id="${p}-cloud" x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" result="b"/>
          <feColorMatrix in="b" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 16 -7"/>
        </filter>
        <pattern id="${p}-grass" width="26" height="12" patternUnits="userSpaceOnUse">
          <path d="M2 11 L3 6 M6 11 L5 5 M11 12 L12.5 7 M16 11 L15 6.5 M20 12 L21.5 6 M24 11 L23.5 7" stroke="#3f6b2c" stroke-width="0.8" stroke-linecap="round" opacity="0.55"/>
        </pattern>`;
}

// Soft contact shadow under an object.
export const shadow = (p, x, y, rx, ry = rx * 0.22, o = 0.28) =>
  `<ellipse cx="${r(x)}" cy="${r(y)}" rx="${r(rx)}" ry="${r(ry)}" fill="#2a3a20" opacity="${o}" filter="url(#${p}-soft)"/>`;

// A Ghibli-style broadleaf tree: a dome of leaf clusters in three tones
// (shadow low-left, mid, sunlit upper-right), a trunk, and a soft shadow.
export function leafyTree(p, x, y, s = 1, tone = 0) {
  const tones = [
    ['#3f6e33', '#5b8f45', '#8cbf61'],
    ['#365f2e', '#4f8240', '#7fb25a'],
    ['#47773a', '#669a4c', '#9bcb6c'],
  ][tone % 3];
  const blobs = [];
  const n = 13;
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (0.05 + 0.9 * (i / (n - 1)));
    const rr = 9 + rand() * 4;
    const bx = Math.cos(a) * -12 * (0.6 + rand() * 0.5);
    const by = -16 - Math.sin(a) * 10 * (0.7 + rand() * 0.5);
    blobs.push([bx, by, 5 + rand() * 3.5, rr]);
  }
  const dark = blobs.map(([bx, by, br]) => `<circle cx="${r(bx - 1.5)}" cy="${r(by + 2)}" r="${r(br + 1.2)}"/>`).join('');
  const mid = blobs.map(([bx, by, br]) => `<circle cx="${r(bx)}" cy="${r(by)}" r="${r(br)}"/>`).join('');
  const lit = blobs
    .filter(([bx, by]) => bx > -4 && by < -18)
    .map(([bx, by, br]) => `<circle cx="${r(bx + 1.6)}" cy="${r(by - 1.6)}" r="${r(br * 0.62)}"/>`)
    .join('');
  return `<g transform="translate(${r(x)} ${r(y)}) scale(${r(s)})">
        ${shadow(p, 3, 0, 15, 3.2, 0.3)}
        <path d="M-1.8 0 L-1.2 -12 L-3.6 -16 L-1 -15 L0 -19 L1 -15 L3.4 -16.5 L1.4 -12 L2 0 Z" fill="#5d4433"/>
        <g fill="${tones[0]}">${dark}</g>
        <g fill="${tones[1]}">${mid}</g>
        <g fill="${tones[2]}" opacity="0.85">${lit}</g>
      </g>`;
}

// A painted cumulus: overlapping puffs fused into one soft shape (the
// "cloud" filter), lit from above with a cool, shadowed underside.
let cloudN = 0;
export function cumulus(p, x, y, w, opacity = 1) {
  const id = `${p}-cl${cloudN++}`;
  const puffs = [];
  const n = Math.max(5, Math.round(w / 12));
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const h = Math.sin(t * Math.PI);
    puffs.push([x - w / 2 + t * w + (rand() - 0.5) * 6, y - h * w * 0.14 - rand() * 5, 7 + h * w * 0.13 + rand() * 4]);
  }
  const top = y - w * 0.32;
  return `<g opacity="${opacity}">
        <linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="${r(top)}" x2="0" y2="${r(y + 8)}"><stop offset="0" stop-color="#ffffff"/><stop offset="0.55" stop-color="#f6f7fb"/><stop offset="1" stop-color="#d7dcea"/></linearGradient>
        <g filter="url(#${p}-cloud)" fill="url(#${id})">
          ${puffs.map(([cx, cy, rr]) => `<circle cx="${r(cx)}" cy="${r(cy)}" r="${r(rr)}"/>`).join('')}
          <rect x="${r(x - w / 2 - 4)}" y="${r(y - 6)}" width="${r(w + 8)}" height="12" rx="6"/>
        </g>
      </g>`;
}

// Grass tufts scattered over a slope.
export function tufts(x0, x1, yAt, count, spread, color = '#4f7f3a') {
  const out = [];
  for (let i = 0; i < count; i++) {
    const x = x0 + rand() * (x1 - x0);
    const y = yAt(x) + 4 + rand() * spread;
    const h = 2.5 + rand() * 2.5;
    out.push(`M${r(x - 1.6)} ${r(y)} L${r(x - 2.2)} ${r(y - h)} M${r(x)} ${r(y)} L${r(x + 0.3)} ${r(y - h - 1)} M${r(x + 1.6)} ${r(y)} L${r(x + 2.4)} ${r(y - h)}`);
  }
  return `<path d="${out.join(' ')}" stroke="${color}" stroke-width="0.8" stroke-linecap="round" fill="none" opacity="0.7"/>`;
}

// Little clumps of wildflowers along a slope.
export function flowers(x0, x1, yAt, count, spread = 30) {
  const cols = ['#fff7e6', '#ffd65c', '#f29fb8', '#c9a6f2', '#ffffff'];
  const out = [];
  for (let i = 0; i < count; i++) {
    const x = x0 + rand() * (x1 - x0);
    const y = yAt(x) + 6 + rand() * spread;
    const c = cols[Math.floor(rand() * cols.length)];
    for (let k = 0; k < 4; k++) out.push(`<circle cx="${r(x + (rand() - 0.5) * 7)}" cy="${r(y + (rand() - 0.5) * 3)}" r="${r(0.9 + rand() * 0.7)}" fill="${c}"/>`);
  }
  return out.join('');
}
