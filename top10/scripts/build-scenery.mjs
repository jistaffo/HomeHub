// Draws the background scenery and writes it into public/index.html between
// the <!-- scenery:...:start/end --> markers.
//
//   node scripts/build-scenery.mjs
//
// Two painted scenes, each full of small homages to well-loved films placed
// where they'd naturally live (the approach the Roku City screensaver takes):
// a countryside and a city. Visitors pick one in the Appearance menu. Day
// colors are painted once; at night a moonlight layer is multiplied over the
// scene and the lights glow above it. The pieces live in ./scenery/.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { twinSuns, etMoon, upHouse, kiki } from './scenery/sky.mjs';
import { countryside } from './scenery/countryside.mjs';
import { city, citySky } from './scenery/city.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const INDEX = path.join(here, '..', 'public', 'index.html');

function splice(html, name, content) {
  const start = `<!-- scenery:${name}:start -->`;
  const end = `<!-- scenery:${name}:end -->`;
  const a = html.indexOf(start);
  const b = html.indexOf(end);
  if (a < 0 || b < 0) throw new Error(`markers for ${name} not found in index.html`);
  return html.slice(0, a + start.length) + '\n    ' + content + '\n    ' + html.slice(b);
}

const sky = [twinSuns(), etMoon(), upHouse(), kiki(), citySky()].join('\n    ');
let html = fs.readFileSync(INDEX, 'utf8');
html = splice(html, 'sky', sky);
html = splice(html, 'hills', countryside() + '\n    ' + city());
fs.writeFileSync(INDEX, html);
console.log('Scenery written to', path.relative(process.cwd(), INDEX));
