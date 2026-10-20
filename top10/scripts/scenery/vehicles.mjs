import { W, H, r, curve, rand, setSeed, C } from './lib.mjs';

export function delorean(p) {
  // Back to the Future: the DMC-12 time machine in profile. A low stainless
  // wedge (long flat hood, raked windshield, short roof, louvered rear slope,
  // squared-off tail), black side strip, gull-wing door seams, Mr. Fusion on
  // the rear deck, exhaust vents out back, copper coils and the ribbed
  // conduit along the sill, turbine-style hubs, and the twin fire trails.
  const louvers = Array.from({ length: 6 }, (_, i) => {
    const t = (i + 0.6) / 6.4;
    const x = 5.6 + t * 12.6;
    const y = 8.2 - t * 3.9;
    return `<path d="M${x.toFixed(2)} ${y.toFixed(2)} l1.1 0.55"/>`;
  }).join('');
  const hub = (cx, cy, rr) =>
    `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="#1b1c1f"/><circle cx="${cx}" cy="${cy}" r="${(rr * 0.66).toFixed(2)}" fill="#b9bec4"/>` +
    `<g stroke="#5c626a" stroke-width="0.35">${Array.from({ length: 8 }, (_, i) => {
      const a = (i / 8) * Math.PI * 2;
      const r1 = rr * 0.22;
      const r2 = rr * 0.62;
      return `<path d="M${(cx + Math.cos(a) * r1).toFixed(2)} ${(cy + Math.sin(a) * r1).toFixed(2)} L${(cx + Math.cos(a + 0.5) * r2).toFixed(2)} ${(cy + Math.sin(a + 0.5) * r2).toFixed(2)}"/>`;
    }).join('')}</g><circle cx="${cx}" cy="${cy}" r="${(rr * 0.2).toFixed(2)}" fill="#3a3e44"/>`;
  return `<g class="delorean">
        <defs>
          <linearGradient id="${p}-fire" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fff2a8"/><stop offset="0.25" stop-color="#ffb43c"/><stop offset="0.7" stop-color="#ff5a1f" stop-opacity="0.7"/><stop offset="1" stop-color="#ff5a1f" stop-opacity="0"/></linearGradient>
          <linearGradient id="${p}-steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3f5f7"/><stop offset="0.45" stop-color="#cfd4d9"/><stop offset="1" stop-color="#9aa0a7"/></linearGradient>
        </defs>
        <g class="fire-trails"><rect x="-150" y="15.2" width="150" height="2.2" rx="1.1" fill="url(#${p}-fire)"/><rect x="-124" y="17.2" width="128" height="1.8" rx="0.9" fill="url(#${p}-fire)"/></g>
        <g class="car-body">
          <g fill="#9aa0a8"><rect x="-2.4" y="9.5" width="3" height="0.9" rx="0.3"/><rect x="-2.4" y="10.9" width="3" height="0.9" rx="0.3"/><rect x="-2.4" y="12.3" width="3" height="0.9" rx="0.3"/></g>
          <g fill="#2a2c30"><rect x="-2.6" y="9.5" width="0.6" height="0.9"/><rect x="-2.6" y="10.9" width="0.6" height="0.9"/><rect x="-2.6" y="12.3" width="0.6" height="0.9"/></g>
          <path d="M1 14.6 L0.4 10.4 L1.2 9 L5 8.4 L19 4 L31 3.4 L39.5 7.4 L57.5 9.4 L60 10.4 L60.4 12.6 L59.6 14.6 L53.6 14.6 A5 5 0 0 0 43.6 14.6 L17.6 14.6 A5 5 0 0 0 7.6 14.6 Z" fill="url(#${p}-steel)"/>
          <path d="M40 7.9 L57.4 9.8" stroke="#ffffff" stroke-width="0.45" opacity="0.7"/>
          <path d="M1 12.4 L59.9 12.8 L59.7 14.6 L53.6 14.6 A5 5 0 0 0 43.6 14.6 L17.6 14.6 A5 5 0 0 0 7.6 14.6 L1 14.6 Z" fill="#8b9097"/>
          <path d="M1 11.2 L59.9 11.6 L59.9 12.6 L1 12.3 Z" fill="#26282c"/>
          <path d="M21 4.6 L30.6 4.1 L37.6 7.5 L21.4 7.9 Z" fill="#2b3340"/>
          <path d="M22.2 5 L26 4.8 L25 7.6 L22.4 7.7 Z" fill="#6b7d93" opacity="0.7"/>
          <path d="M20.2 4.2 L20.6 11.2 M38.4 7.6 L38.1 11.4 M20.2 4.2 L30.8 3.7" stroke="#7e848c" stroke-width="0.35" fill="none"/>
          <g stroke="#3a3e45" stroke-width="0.55" stroke-linecap="round">${louvers}</g>
          <rect x="2.8" y="5.2" width="3.4" height="3.4" rx="0.7" fill="#ece9e2"/>
          <rect x="2.6" y="4.8" width="3.8" height="0.9" rx="0.4" fill="#c9c4b9"/>
          <path d="M3.4 6.4 H5.6" stroke="#9a948a" stroke-width="0.3"/>
          <g stroke="#c4793a" stroke-width="0.55">${[0, 1, 2, 3].map((i) => `<path d="M${2 + i * 1.2} 9.6 l0.9 1.4"/>`).join('')}</g>
          <rect x="18.5" y="12.6" width="24" height="1.3" rx="0.65" fill="#3a3d42"/>
          <g stroke="#6a6f77" stroke-width="0.3">${Array.from({ length: 15 }, (_, i) => `<path d="M${(19.4 + i * 1.55).toFixed(2)} 12.6 v1.3"/>`).join('')}</g>
          <rect x="57.9" y="10.5" width="2.1" height="1.1" rx="0.2" fill="#f6f2dc"/>
          <rect x="58.6" y="11.8" width="1.2" height="0.6" fill="#f2a23a"/>
          <rect x="0.4" y="10.2" width="0.9" height="1.4" fill="#c4323a"/>
          ${hub(12.6, 14.2, 4)}${hub(48.6, 14.4, 3.8)}
        </g>
        <path class="headlight" d="M60 10.6 L96 5 L96 18 L60 12 Z" fill="#fff6c8" opacity="0"/>
      </g>`;
}

export function vwBus() {
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

export function brideBike() {
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

export function warRig() {
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
  return `<g class="vehicle tumbler">
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
      </g>`;
}
