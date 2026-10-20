import { W, H, r, curve, rand, setSeed, C } from './lib.mjs';

export function delorean(p) {
  // Back to the Future: the stainless wedge with twin fire trails.
  return `<g class="delorean">
        <defs>
          <linearGradient id="${p}-fire" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#fff2a8"/><stop offset="0.25" stop-color="#ffb43c"/><stop offset="0.7" stop-color="#ff5a1f" stop-opacity="0.7"/><stop offset="1" stop-color="#ff5a1f" stop-opacity="0"/></linearGradient>
          <linearGradient id="${p}-steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef0f2"/><stop offset="0.6" stop-color="#bfc4ca"/><stop offset="1" stop-color="#8e949b"/></linearGradient>
        </defs>
        <g class="fire-trails"><rect x="-150" y="12.2" width="150" height="2.4" rx="1.2" fill="url(#${p}-fire)"/><rect x="-118" y="15.4" width="122" height="2.4" rx="1.2" fill="url(#${p}-fire)"/></g>
        <g class="car-body">
        <path d="M0 13 L1 8.5 L12 6.5 L22 2 L33 1.5 L40 6 L50 7.5 L52 10 L51.5 14 L0.5 14.5 Z" fill="url(#${p}-steel)"/>
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
  // The Dark Knight: the Tumbler, all angles and huge tires.
  return `<g class="vehicle tumbler">
        <g class="car-body">
          <path d="M0 12 L4 5 L18 3 L26 -2 L40 -2 L48 4 L58 6 L60 12 Z" fill="#2b2d30"/>
          <path d="M26 -2 L40 -2 L44 2 L28 3 Z" fill="#4a4e55"/>
          <path d="M4 5 L18 3 L20 7 L6 8 Z M44 4 L58 6 L58 9 L46 8 Z" fill="#3a3d42"/>
          <path d="M30 0 L38 0 L40 2 L31 2.4 Z" fill="#7a8592"/>
          <circle cx="10" cy="13" r="5.6" fill="#141414"/><circle cx="10" cy="13" r="2" fill="#3a3a3a"/>
          <circle cx="50" cy="12.6" r="6.2" fill="#141414"/><circle cx="50" cy="12.6" r="2.2" fill="#3a3a3a"/>
          <circle cx="22" cy="14" r="4.2" fill="#141414"/>
        </g>
        <path class="headlight" d="M60 7 L92 2 L92 14 L60 9 Z" fill="#fff6c8" opacity="0"/>
      </g>`;
}
