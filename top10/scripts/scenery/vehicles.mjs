// Every vehicle is drawn facing right with its tires on y = 18, then scaled up
// around that line so they read clearly against the scenery.
const SCALE = 1.45;
const big = (inner) => `<g transform="translate(0 18) scale(${SCALE}) translate(0 -18)">${inner}</g>`;

// A ribbed conduit (the DeLorean's flux bands, hoses) along a straight run.
function ribbed(x1, y1, x2, y2, w, fill, rib, gap = 0.9) {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const a = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const ribs = Array.from({ length: Math.floor(len / gap) }, (_, i) => `M${(i * gap + gap / 2).toFixed(2)} ${-w / 2} v${w}`).join(' ');
  return `<g transform="translate(${x1} ${y1}) rotate(${a.toFixed(2)})"><rect x="0" y="${-w / 2}" width="${len.toFixed(2)}" height="${w}" rx="${w / 2}" fill="${fill}"/><path d="${ribs}" stroke="${rib}" stroke-width="0.28"/></g>`;
}

export function delorean(p) {
  // Back to the Future: Doc Brown's DMC-12 time machine, in profile. The
  // stainless wedge (flat hood, raked windshield, short roof, louvered
  // fastback, squared tail) with the black rub strip and gull-wing doors.
  // Doc's additions: Mr. Fusion on the reactor, the two big cooling vents
  // (trash cans in the first film) angled off the rear deck, the reactor coils
  // and canisters between them, the tachyon pulse emitter on the rear roof,
  // the ribbed flux bands down the B-pillar and along the rear, more wrapped
  // round the front bumper with the flux boxes, the rear vent panel, the
  // turbine-style wheels and, when it hits 88, fire trails and blue sparks.
  const hub = (cx, cy, rr) =>
    `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="#1b1c1f"/><circle cx="${cx}" cy="${cy}" r="${(rr * 0.64).toFixed(2)}" fill="#b9bec4"/>` +
    `<g stroke="#5c626a" stroke-width="0.4">${Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2;
      const r1 = rr * 0.2;
      const r2 = rr * 0.6;
      return `<path d="M${(cx + Math.cos(a) * r1).toFixed(2)} ${(cy + Math.sin(a) * r1).toFixed(2)} L${(cx + Math.cos(a + 0.45) * r2).toFixed(2)} ${(cy + Math.sin(a + 0.45) * r2).toFixed(2)}"/>`;
    }).join('')}</g><circle cx="${cx}" cy="${cy}" r="${(rr * 0.18).toFixed(2)}" fill="#3a3e44"/>`;
  const louvers = Array.from({ length: 9 }, (_, i) => {
    const t = (i + 0.5) / 9;
    const x = 7.4 + t * 15;
    const y = 7.6 - t * 4.9;
    return `<path d="M${x.toFixed(2)} ${y.toFixed(2)} l1.4 0.9"/>`;
  }).join('');
  // One of the big cooling vents: a ribbed can, open end pointing back and up.
  const vent = (x, y, sc, shade) => `<g transform="translate(${x} ${y}) rotate(-28) scale(${sc})">
            <rect x="-3.6" y="-2" width="6.4" height="4" rx="0.6" fill="${shade}"/>
            <g stroke="#2c2f34" stroke-width="0.35">${[-2.6, -1.6, -0.6, 0.4, 1.4].map((v) => `<path d="M${v} -2 v4"/>`).join('')}</g>
            <ellipse cx="-3.6" cy="0" rx="0.9" ry="2" fill="#1a1b1e"/>
            <ellipse cx="-3.6" cy="0" rx="0.55" ry="1.4" fill="#3b3e44"/>
          </g>`;
  const sparks = ['M4 2 l3 -2 l-1 3 l4 -2', 'M30 -1 l2 -3 l1 2 l3 -3', 'M50 6 l3 -2 l0 2 l3 -2', 'M18 17 l3 1 l-1 -2 l4 1', 'M-2 6 l-3 -2 l1 3 l-4 -1']
    .map((d) => `<path d="${d}"/>`).join('');
  return `<g class="delorean">${big(`
        <defs>
          <linearGradient id="${p}-fire" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fff2a8"/><stop offset="0.25" stop-color="#ffb43c"/><stop offset="0.7" stop-color="#ff5a1f" stop-opacity="0.7"/><stop offset="1" stop-color="#ff5a1f" stop-opacity="0"/></linearGradient>
          <linearGradient id="${p}-steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f6f8"/><stop offset="0.5" stop-color="#cdd2d8"/><stop offset="1" stop-color="#a3a9b0"/></linearGradient>
        </defs>
        <g class="fire-trails"><rect x="-110" y="16" width="112" height="2" rx="1" fill="url(#${p}-fire)" opacity="0.7"/><rect x="-104" y="17.1" width="150" height="1.9" rx="0.9" fill="url(#${p}-fire)"/></g>
        <g class="car-body">
          <!-- far-side cooling vent, peeking over the deck -->
          ${vent(4.6, 4.2, 0.92, '#6e747c')}
          <!-- rear vent panel -->
          <g fill="#8d939b">${[9.2, 10.8, 12.4].map((y) => `<rect x="-1.4" y="${y}" width="2.4" height="1.1" rx="0.25"/>`).join('')}</g>
          <g fill="#202226">${[9.2, 10.8, 12.4].map((y) => `<rect x="-1.6" y="${y}" width="0.6" height="1.1"/>`).join('')}</g>
          <path d="M9 15 A4.6 4.6 0 0 1 18.2 15 Z M43.4 15 A4.6 4.6 0 0 1 52.6 15 Z" fill="#26282c"/>
          <!-- the stainless body -->
          <path d="M0.8 15 L0.4 9.4 L1.4 8 L6.6 7.6 L23.6 2.2 L31.4 1.8 L40.4 7 L56.8 9 L59.8 10.2 L60.2 12.8 L59.4 15 L52.6 15 A4.6 4.6 0 0 0 43.4 15 L18.2 15 A4.6 4.6 0 0 0 9 15 Z" fill="url(#${p}-steel)"/>
          <path d="M40.8 7.5 L56.6 9.4" stroke="#ffffff" stroke-width="0.5" opacity="0.75"/>
          <g stroke="#9ea4ab" stroke-width="0.18" opacity="0.6">${[9.6, 10.2].map((y) => `<path d="M2 ${y} L58 ${y + 0.4}"/>`).join('')}</g>
          <!-- black rub strip, grey bumpers -->
          <path d="M0.5 11 L60.1 11.4 L60.1 12.5 L0.6 12.2 Z" fill="#26282c"/>
          <path d="M0.6 12.2 L3.4 12.2 L3.2 15 L0.8 15 Z" fill="#5d6168"/>
          <path d="M57.4 12.4 L60.1 12.5 L59.4 15 L56.8 15 Z" fill="#5d6168"/>
          <!-- louvered fastback and the side glass -->
          <path d="M7 7.5 L23.4 2.4 L24 3.6 L8.2 8.6 Z" fill="#2a2d32"/>
          <g stroke="#7c838c" stroke-width="0.35">${louvers}</g>
          <path d="M24.6 2.7 L31 2.4 L38.8 7.2 L25.2 7.7 Z" fill="#2b3340"/>
          <path d="M26 3 L29.4 2.85 L28 7.4 L26.2 7.5 Z" fill="#7d93ab" opacity="0.55"/>
          <!-- gull-wing door seams and handle -->
          <path d="M24.3 2.2 L24.8 11 M39.8 7.3 L40.4 11.1 M24.3 2.2 L31.4 1.8" stroke="#7e848c" stroke-width="0.32" fill="none"/>
          <rect x="35.6" y="8.3" width="2" height="0.5" rx="0.2" fill="#3a3d42"/>
          <!-- flux bands: down the B-pillar and back along the rear -->
          ${ribbed(24.1, 3, 24.6, 10.4, 1.05, '#9aa1aa', '#4a4f57')}
          ${ribbed(24.4, 10.3, 2.2, 10.2, 1.05, '#9aa1aa', '#4a4f57')}
          ${ribbed(2.4, 10.4, 1.6, 8.6, 1.05, '#9aa1aa', '#4a4f57')}
          <!-- front flux bands round the bumper, and the flux boxes -->
          ${ribbed(50.5, 13.4, 59.6, 13.6, 1.1, '#9aa1aa', '#4a4f57')}
          <rect x="53.6" y="10.1" width="2.2" height="1.1" rx="0.2" fill="#3d4148"/><rect x="54" y="10.3" width="1.4" height="0.4" fill="#d9a23a"/>
          <!-- quad headlights, indicator, tail lamp -->
          <rect x="58.2" y="10.4" width="1.8" height="0.9" rx="0.2" fill="#f6f2dc"/>
          <rect x="58.9" y="12.9" width="1" height="0.5" fill="#f2a23a"/>
          <rect x="0.4" y="9.5" width="0.9" height="1.4" fill="#c4323a"/>
          <rect x="-0.1" y="12.6" width="0.6" height="1.4" fill="#f4f3ee"/>
          <!-- the reactor, its coils and canisters, and the tachyon emitter -->
          <path d="M0.8 8 L1 5.4 L8.4 5 L9.2 7.6 Z" fill="#4a4e55"/>
          <rect x="9" y="5.6" width="3" height="1.2" rx="0.3" fill="#2b2e33"/>
          <g fill="none" stroke="#c97b3a" stroke-width="0.55">${[9.6, 10.4, 11.2].map((x) => `<ellipse cx="${x}" cy="5.6" rx="0.35" ry="1.1"/>`).join('')}</g>
          <rect x="11.8" y="4.6" width="1.6" height="1.4" rx="0.3" fill="#b9bec4" transform="rotate(-17 12.6 5.3)"/>
          <path d="M13.4 5.4 L16.6 4.4 L17 5.4 L13.8 6.4 Z" fill="#26282c"/>
          <circle cx="14.4" cy="5.2" r="0.35" fill="#d94a3a"/>
          <rect x="2" y="6" width="1.6" height="1.2" fill="#f2c43a"/><path d="M2.8 6.3 v0.6 M2.4 6.6 h0.8" stroke="#2b2b2b" stroke-width="0.25"/>
          <!-- Mr. Fusion -->
          <path d="M5.2 5.4 L5.6 1 L8.6 1 L9 5.4 Z" fill="#efebe2"/>
          <path d="M5.4 3.4 L8.8 3.4" stroke="#c8c2b5" stroke-width="0.35"/>
          <path d="M5.1 1.2 C5.4 -0.6 8.8 -0.6 9.1 1.2 Z" fill="#dcd6c9"/>
          <rect x="6.7" y="-1.3" width="0.8" height="0.9" rx="0.2" fill="#bfb8aa"/>
          <!-- near-side cooling vent -->
          ${vent(2, 6.6, 0.9, '#9aa1aa')}
          <!-- hoses from the reactor down over the rear arch -->
          <path d="M8.6 7.4 C10.6 7.6 11.6 8.6 12.2 10.1" stroke="#1d1f22" stroke-width="0.9" fill="none"/>
          <path d="M7.8 7.8 C9.2 8.6 9.8 9.4 10.2 10.2" stroke="#c97b3a" stroke-width="0.5" fill="none"/>
          ${hub(13.6, 14, 4.2)}${hub(48, 14.1, 4.1)}
        </g>
        <g class="time-sparks" fill="none" stroke="#9fe3ff" stroke-width="0.6" stroke-linejoin="round">${sparks}</g>
        <path class="headlight" d="M60 10.4 L92 5.6 L92 16.6 L60 11.6 Z" fill="#fff6c8" opacity="0"/>
      `)}</g>`;
}

export function vwBus() {
  // Little Miss Sunshine: the family's 1970s VW Type 2 "bay window" bus,
  // yellow below the swage line and white above, three side windows behind
  // the cab door, engine-air louvers on the rear quarter, chunky bumpers.
  // The clutch is gone, so the family runs behind to push-start it.
  const runner = (x, h, shirt, skin, lean, stride, glasses = false) => `<g transform="translate(${x} 18) rotate(${lean})">
          <path d="M0 ${-h * 0.45} L${-stride} 0 M0 ${-h * 0.45} L${stride * 0.8} -0.6" stroke="#3a3a46" stroke-width="${(h * 0.09).toFixed(2)}" stroke-linecap="round"/>
          <path d="M${-h * 0.13} ${-h * 0.45} L${-h * 0.11} ${-h * 0.82} L${h * 0.13} ${-h * 0.82} L${h * 0.14} ${-h * 0.45} Z" fill="${shirt}"/>
          <path d="M${h * 0.08} ${-h * 0.76} L${h * 0.42} ${-h * 0.66}" stroke="${shirt}" stroke-width="${(h * 0.085).toFixed(2)}" stroke-linecap="round"/>
          <circle cx="${h * 0.03}" cy="${-h * 0.9}" r="${(h * 0.1).toFixed(2)}" fill="${skin}"/>
          <path d="M${-h * 0.08} ${-h * 0.95} C${-h * 0.04} ${-h * 1.03} ${h * 0.1} ${-h * 1.03} ${h * 0.13} ${-h * 0.93}" stroke="#3a2a22" stroke-width="${(h * 0.06).toFixed(2)}" fill="none"/>
          ${glasses ? `<rect x="${h * 0.06}" y="${-h * 0.93}" width="${h * 0.09}" height="${h * 0.05}" fill="#222"/>` : ''}
        </g>`;
  const wheel = (cx) => `<circle cx="${cx}" cy="14.4" r="3.6" fill="#1d1f24"/><circle cx="${cx}" cy="14.4" r="2.3" fill="#c9cdd2"/><circle cx="${cx}" cy="14.4" r="1.3" fill="#eef0f2"/><circle cx="${cx}" cy="14.4" r="0.4" fill="#8a8f96"/>`;
  return `<g class="vehicle bus">${big(`
        ${runner(-14.6, 15, '#7c8794', '#e2b896', 22, 4.6)}${runner(-7, 17, '#2c2c30', '#e2b896', 24, 5.2)}${runner(-22.6, 10, '#c9493c', '#e9c2a0', 16, 3.6, true)}
        <g class="car-body">
          <path d="M1 15.2 L0.6 1.2 C0.6 -2.2 2 -3.6 5 -3.6 L44 -3.6 C47.4 -3.6 49 -2.4 49.4 0.4 L50 5 L50 15.2 L45.9 15.2 A4.2 4.2 0 0 0 37.5 15.2 L19.2 15.2 A4.2 4.2 0 0 0 10.8 15.2 Z" fill="#fbf6ea"/>
          <path d="M0.8 5.2 L50 5.2 L50 15.2 L45.9 15.2 A4.2 4.2 0 0 0 37.5 15.2 L19.2 15.2 A4.2 4.2 0 0 0 10.8 15.2 L1 15.2 Z" fill="#f4c22f"/>
          <path d="M0.8 5.2 L50 5.2" stroke="#d9a51c" stroke-width="0.7"/>
          <path d="M0.9 12.2 L50 12.2" stroke="#e0ae22" stroke-width="0.4"/>
          <path d="M1 -2 C2 -3.2 3 -3.4 5 -3.4 L44 -3.4" stroke="#ffffff" stroke-width="0.6" fill="none" opacity="0.8"/>
          <!-- side windows, cab door window with its vent wing, and the wrap of the bay windshield -->
          <g fill="#7fa7bd">${[[6.6, 15.4], [16.8, 25.6], [27, 35.8]].map(([a, b]) => `<rect x="${a}" y="-1.4" width="${(b - a).toFixed(1)}" height="5" rx="1"/>`).join('')}</g>
          <path d="M38.4 -1.4 L46.4 -1.4 C47.6 -1.4 48.2 -0.6 48.4 0.6 L48.8 3.6 L38.4 3.6 Z" fill="#7fa7bd"/>
          <path d="M42 -1.4 L42 3.6" stroke="#fbf6ea" stroke-width="0.6"/>
          <path d="M48.9 -1.6 L49.6 -1.2 L50 3.6 L49.3 3.6 Z" fill="#6f98ae"/>
          <g fill="#ffffff" opacity="0.4">${[7.4, 17.6, 27.8, 39.2].map((x) => `<path d="M${x} -0.8 l2.4 0 l-2 3.6 l-0.4 0 Z"/>`).join('')}</g>
          <!-- engine-air louvers on the rear quarter -->
          <g stroke="#c9c2b2" stroke-width="0.5">${[-1, 0.2, 1.4, 2.6].map((y) => `<path d="M2 ${y} h2.6"/>`).join('')}</g>
          <!-- door seams, handle, engine lid -->
          <path d="M37.2 -2.6 L37.2 15 M49.6 5.2 L49.8 15" stroke="#c99a20" stroke-width="0.3" fill="none"/>
          <rect x="38" y="6.2" width="1.8" height="0.5" rx="0.2" fill="#9aa0a8"/>
          <path d="M1.2 7 L9 7 L9 11.2 L1.2 11.2" stroke="#d9a51c" stroke-width="0.3" fill="none"/>
          <!-- bumpers and lamps -->
          <rect x="-0.8" y="12.6" width="3.4" height="1.6" rx="0.5" fill="#dfe2e5"/>
          <rect x="47.8" y="12.4" width="3.4" height="1.6" rx="0.5" fill="#dfe2e5"/>
          <rect x="0.4" y="7.6" width="0.9" height="2.2" rx="0.3" fill="#c4323a"/>
          <rect x="49.4" y="8.6" width="0.9" height="1" rx="0.3" fill="#f2a23a"/>
          <circle cx="49.6" cy="7.2" r="1" fill="#fff8d0"/>
          ${wheel(15)}${wheel(41.7)}
        </g>
      `)}</g>`;
}

export function warRig() {
  // Mad Max: Fury Road. The War Rig: a Tatra T815 with the cab pushed back,
  // a long hood with two supercharged V8s and their blowers, a 1940s
  // Chevrolet Fleetmaster body welded on behind the cab, tall exhaust stacks,
  // spikes, and a rusted silver tanker with a VW Beetle turret on top. Chasing
  // it out of the dust storm: the Doof Wagon, its wall of speakers, the
  // drummers, and the Doof Warrior's flame-throwing guitar.
  const tire = (cx, cy, rr) => `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="#1a1a1a"/><circle cx="${cx}" cy="${cy}" r="${(rr - 0.6).toFixed(2)}" fill="none" stroke="#333" stroke-width="1" stroke-dasharray="1.2 1"/><circle cx="${cx}" cy="${cy}" r="${(rr * 0.42).toFixed(2)}" fill="#5b4a3c"/><circle cx="${cx}" cy="${cy}" r="${(rr * 0.15).toFixed(2)}" fill="#2a2420"/>`;
  const spikes = (x0, x1, y, h, step = 3.4) =>
    Array.from({ length: Math.floor((x1 - x0) / step) + 1 }, (_, i) => `<path d="M${(x0 + i * step).toFixed(1)} ${y} l0.7 ${-h} l0.7 ${h} Z"/>`).join('');
  const dust = [[-30, 6, 14], [-70, -6, 22], [-104, 2, 20], [-140, -10, 24], [-172, 4, 18], [-120, -26, 16], [-60, -24, 14], [-190, -16, 20]]
    .map(([x, y, rr]) => `<circle cx="${x}" cy="${y}" r="${rr}"/>`)
    .join('');
  const speakers = [];
  for (let col = 0; col < 4; col++)
    for (let row = 0; row < 5; row++) {
      const x = -84 + col * 7.4;
      const y = -18 + row * 5.4 + (col % 2) * 0.6;
      speakers.push(`<rect x="${x}" y="${y.toFixed(1)}" width="7" height="5" rx="0.6" fill="#1f1f22"/><circle cx="${x + 3.5}" cy="${(y + 2.5).toFixed(1)}" r="1.8" fill="#3a3b40"/><circle cx="${x + 3.5}" cy="${(y + 2.5).toFixed(1)}" r="0.7" fill="#6b6c72"/>`);
    }
  return `<g class="vehicle rig">${big(`
        <g class="dust" fill="#d9b98a" opacity="0.75">${dust}</g>
        <g class="car-body">
          <!-- The Doof Wagon -->
          <rect x="-98" y="8.4" width="62" height="3.4" fill="#2a2420"/>
          <rect x="-90" y="5.6" width="44" height="3" fill="#4a3a2e"/>
          <g>${speakers.join('')}</g>
          <rect x="-87" y="-21" width="35" height="3" fill="#2a2420"/>
          <g fill="#3a2e26">${spikes(-86, -54, -21, 2.4)}</g>
          <path d="M-50 11 L-50 -1 L-42 -2 L-37 4 L-35 5 L-35 11 Z" fill="#3b3631"/>
          <path d="M-48 0 L-42.4 -0.6 L-39 3.8 L-48 4 Z" fill="#7d8b92"/>
          <!-- the drummers on the back, and their drums -->
          <g transform="translate(-95 8)"><ellipse cx="0" cy="-2.6" rx="2.8" ry="2.6" fill="#8a5a36"/><path d="M-3 -10 L-3 -4 M-3 -9 L1 -7" stroke="#c9bfae" stroke-width="1.2" stroke-linecap="round"/><circle cx="-3" cy="-11.6" r="1.4" fill="#e6ddd0"/></g>
          <!-- the Doof Warrior on his bungees, guitar firing forward -->
          <g transform="translate(-45 -2)">
            <path d="M-4 -18 L-1 -12 M4 -18 L1 -12" stroke="#2a2420" stroke-width="0.5"/>
            <path d="M-1.4 -1 L-1 -11 L1.6 -11 L2 -1 Z" fill="#c42f2a"/>
            <path d="M-1 -1 L-2 3.6 M1.4 -1 L2.4 3.6" stroke="#a82621" stroke-width="1.2"/>
            <circle cx="0.4" cy="-12.6" r="1.6" fill="#d8cfc0"/>
            <path d="M-1 -6 L9 -9.6" stroke="#9aa0a8" stroke-width="1.1" stroke-linecap="round"/>
            <path d="M-2.6 -7.6 C-1 -9 1.8 -7.8 1.4 -5.6 C1 -4 -2.6 -4.2 -2.6 -5.6 Z" fill="#b9bec4"/>
            <path class="guitar-flame" d="M9 -9.6 C13 -12.6 17 -10.6 22 -12.4 C18 -9 14 -8.4 9 -9.6 Z" fill="#ff8a2a"/>
          </g>
          ${[-92, -84, -58, -50].map((x) => tire(x, 13.6, 4.4)).join('')}

          <!-- The tanker -->
          <rect x="4" y="9" width="84" height="3.2" fill="#2a2420"/>
          <rect x="2" y="-9" width="86" height="18.4" rx="8" fill="#a39b8e"/>
          <rect x="4" y="-8.4" width="82" height="5" rx="2.5" fill="#c9c1b2" opacity="0.7"/>
          <rect x="4" y="3.4" width="82" height="5" rx="2.5" fill="#7d7266" opacity="0.6"/>
          <g fill="#2f2a26">${[12, 30, 48, 66, 82].map((x) => `<rect x="${x}" y="-9" width="1.6" height="18.4"/>`).join('')}</g>
          <g fill="#9a5a32" opacity="0.55">${[[18, 0, 4.2, 2.6], [40, 3, 5.6, 2.4], [57, -2, 3.8, 3.2], [74, 4, 4.4, 2]].map(([x, y, rx, ry]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>`).join('')}</g>
          <g stroke="#7a4a2a" stroke-width="0.5" opacity="0.6">${[22, 36, 52, 70].map((x) => `<path d="M${x} -2 l0.4 9"/>`).join('')}</g>
          <path d="M8 -11.6 L84 -11.6" stroke="#3a322c" stroke-width="0.7"/>
          <g stroke="#3a322c" stroke-width="0.6">${[10, 26, 42, 58, 74, 84].map((x) => `<path d="M${x} -11.6 v2.8"/>`).join('')}</g>
          <g fill="#3a322c">${spikes(30, 82, -11.6, 2.2, 4.6)}</g>
          <path d="M1 -6 L1 8" stroke="#3a322c" stroke-width="0.6"/><g stroke="#3a322c" stroke-width="0.5">${[-4, -1, 2, 5].map((y) => `<path d="M0 ${y} h2"/>`).join('')}</g>
          <!-- the VW Beetle turret -->
          <path d="M8 -9 C8 -14 11 -17.6 16 -17.6 C21 -17.6 24.6 -14.6 25.6 -9 Z" fill="#8a7a62"/>
          <path d="M12.6 -12 C13 -14.6 15 -16 17.6 -15.8 L20.6 -12 Z" fill="#3f4a50"/>
          <path d="M23 -13.6 L32 -15.6" stroke="#2a2420" stroke-width="0.9" stroke-linecap="round"/>
          <!-- coupling -->
          <rect x="86" y="8" width="8" height="2.4" fill="#2a2420"/>

          <!-- The Tatra: frame, Fleetmaster body, cab, long hood with the blowers -->
          <rect x="88" y="8.6" width="48" height="3.4" fill="#2a2420"/>
          <path d="M90 9 L90 2 C90 -3.6 94 -6.4 99.6 -6.4 L104.4 -6.4 L104.4 9 Z" fill="#3a2f28"/>
          <path d="M93 -1.4 C93.4 -3.6 95.6 -4.8 98.4 -4.8 L101.6 -4.8 L101.6 -0.6 Z" fill="#6b7a80"/>
          <path d="M91 4.4 L104 4.4" stroke="#8a6a4a" stroke-width="0.5"/>
          <rect x="103.6" y="-8.4" width="14" height="17.6" rx="1" fill="#2e2824"/>
          <path d="M113.6 -6.4 L117.2 -6.4 L117.2 0 L112.6 0 Z" fill="#6b7a80"/>
          <path d="M105.4 -6 L111.4 -6 L111.4 0 L105.4 0 Z" fill="#55626a"/>
          <path d="M104 4 L117.4 4" stroke="#6a4a35" stroke-width="0.5"/>
          <g fill="#e8e2d6"><circle cx="110.2" cy="6.2" r="1.3"/><path d="M109.6 7.4 h1.2 v0.8 h-1.2 Z"/></g>
          <!-- exhaust stacks (they flame) -->
          <rect x="101.6" y="-20" width="1.8" height="22" fill="#b9bec4"/>
          <rect x="98.8" y="-18" width="1.8" height="20" fill="#9ea4ab"/>
          <!-- hood and the twin blowers with their scoops -->
          <path d="M117.4 0.4 L134 2.4 L135.6 9 L117.4 9 Z" fill="#3a302a"/>
          <rect x="119.4" y="-2" width="5.6" height="3" rx="0.4" fill="#b9bec4"/><rect x="126.4" y="-1.2" width="5.6" height="3" rx="0.4" fill="#b9bec4"/>
          <g stroke="#7e848c" stroke-width="0.3">${[120.4, 121.6, 122.8, 124, 127.4, 128.6, 129.8, 131].map((x) => `<path d="M${x} ${x < 126 ? -2 : -1.2} v3"/>`).join('')}</g>
          <path d="M120 -2 L120.4 -5.6 L124.4 -5.6 L124.6 -2 Z M127 -1.2 L127.4 -4.8 L131.4 -4.8 L131.6 -1.2 Z" fill="#2a2420"/>
          <!-- bull bar and its spikes -->
          <rect x="134.4" y="3" width="2.4" height="10" fill="#2a2420"/>
          <g fill="#4a3c32">${[4, 7, 10].map((y) => `<path d="M136.8 ${y} l3 0.6 l-3 0.6 Z"/>`).join('')}</g>
          <circle cx="135.2" cy="4" r="0.9" fill="#f3e3a6"/>
          ${[8, 18, 28].map((x) => tire(x, 13.4, 4.6)).join('')}
          ${[94, 104.4, 127].map((x) => tire(x, 12.8, 5.2)).join('')}
        </g>
        <g class="flames"><path d="M102.5 -20 C99.6 -26 103.6 -30 102.6 -36 C106.6 -31 106.4 -25 102.5 -20 Z M99.7 -18 C97 -23 100.4 -26 100 -31 C103.4 -26.4 103 -22 99.7 -18 Z" fill="#ff8a2a"/><path d="M102.5 -21 C101.4 -24 103.4 -27 103.4 -30 C105 -27 104.4 -24 102.5 -21 Z" fill="#ffe08a"/></g>
      `)}</g>`;
}

export function tumbler() {
  // The Dark Knight: the Tumbler in profile. Matte black and faceted, a low
  // cockpit slit, a long sloping armored nose, huge knobby rear tires, front
  // wheels pushed out ahead of the nose on exposed arms, the airbrake flap
  // and jet nozzle at the back.
  const tire = (cx, cy, rr) => `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="#141414"/>
          <circle cx="${cx}" cy="${cy}" r="${(rr - 0.7).toFixed(2)}" fill="none" stroke="#2c2c2c" stroke-width="1.4" stroke-dasharray="1.5 1.2"/>
          <circle cx="${cx}" cy="${cy}" r="${(rr * 0.6).toFixed(2)}" fill="#1e1f21"/>
          <circle cx="${cx}" cy="${cy}" r="${(rr * 0.38).toFixed(2)}" fill="#3a3d42"/>
          <g fill="#6a6e74">${Array.from({ length: 5 }, (_, i) => {
            const a = (i / 5) * Math.PI * 2;
            return `<circle cx="${(cx + Math.cos(a) * rr * 0.25).toFixed(2)}" cy="${(cy + Math.sin(a) * rr * 0.25).toFixed(2)}" r="0.35"/>`;
          }).join('')}</g>
          <circle cx="${cx}" cy="${cy}" r="${(rr * 0.12).toFixed(2)}" fill="#141414"/>`;
  return `<g class="vehicle tumbler">${big(`
        <g class="car-body">
          <path d="M44 9.4 L52 13" stroke="#2f3236" stroke-width="1.8" stroke-linecap="round"/>
          <path d="M43 6.6 L51 12" stroke="#5c6066" stroke-width="0.9" stroke-dasharray="0.7 0.5"/>
          <path d="M2 12.4 L0.4 6 L2 0.6 L14 -1.6 L24 -0.6 L34 1.6 L46 5 L58 8 L60.4 10.6 L53 11.4 L46 12 L22 13 Z" fill="#2a2c2f"/>
          <path d="M14 -1.6 L24 -0.6 L34 1.6 L46 5 L58 8 L56 8.6 L44 6.4 L32 3.6 L22 1.8 L13 0.4 Z" fill="#45484e"/>
          <path d="M22 1.8 L32 3.6 L44 6.4 L56 8.6 L53 11.4 L46 12 L26 12.6 L24 6 Z" fill="#303337"/>
          <g stroke="#53575d" stroke-width="0.35" fill="none"><path d="M24 6 L26 12.6 M34 4.6 L35 12.3 M44 6.4 L46 12 M24 6 L44 7.6"/></g>
          <path d="M23 0.4 L32 2.2 L33 3.6 L24 2.2 Z" fill="#121418"/>
          <path d="M25.4 1.1 L30 2" stroke="#6b7f96" stroke-width="0.35"/>
          <path d="M57 8.4 L60.6 9.6 L60.4 11.4 L56.6 11 Z" fill="#3a3d42"/>
          <rect x="58.4" y="9.6" width="1.6" height="0.7" fill="#d8d4c0"/>
          <rect x="-0.9" y="5.4" width="2.6" height="4.2" rx="0.4" fill="#1a1a1a"/>
          <ellipse cx="0.1" cy="7.5" rx="0.7" ry="1.4" fill="#4a2a1a"/>
          ${tire(12, 10.2, 8)}
          <path d="M2.6 2.8 L21.6 1.2 L23.4 4.8 L20.4 5 L18 3.6 L6 4.6 L3.4 6.2 Z" fill="#37393e"/>
          <path d="M2.6 2.8 L21.6 1.2" stroke="#55595f" stroke-width="0.4"/>
          <path d="M1 0.9 L9.4 -3.6 L10.6 -2.8 L2.6 1.8 Z" fill="#45484e"/>
          <path d="M6 -1.4 L7 1.2" stroke="#2a2c2f" stroke-width="0.6"/>
          ${tire(52, 13, 5.2)}
        </g>
        <path class="headlight" d="M60.6 9.8 L96 4.4 L96 16.4 L60.6 11.2 Z" fill="#fff6c8" opacity="0"/>
      `)}</g>`;
}
