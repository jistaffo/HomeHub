import { W, H, r, curve, rand, setSeed, C } from './lib.mjs';

export function twinSuns() {
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

export function etMoon() {
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

export function upHouse() {
  // A small clapboard house with a porch and chimney, lifted by a dense,
  // teardrop-shaped cluster of balloons whose strings meet at the chimney.
  const colors = ['#e9644a', '#f2a541', '#f6d258', '#8cc56b', '#4fb3c7', '#5f84d1', '#a874c9', '#ef8bb0', '#f37e5b', '#7ccdb0'];
  const balloons = [];
  setSeed(11);
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
  return `<svg class="art art-left art-balloons scene-country-only" viewBox="0 0 120 170">
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

export function kiki() {
  // A girl in a dark dress with a big red bow, riding side-saddle on her broom,
  // her black cat perched behind and a little radio hanging from the handle.
  return `<svg class="art art-kiki scene-country-only" viewBox="0 0 140 80">
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
