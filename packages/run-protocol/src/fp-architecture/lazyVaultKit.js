// @ts-check
import '@agoric/zoe/exported.js';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const urlSrc = new URL(
  'npm/ramda@0.28.0/dist/ramda.min.js',
  'https://cdn.jsdelivr.net/npm',
).href;
console.log({ urlSrc });

const ramdap = path.dirname(urlSrc);
console.log({ ramdap });

const Box = f => ({
  map: g => Box(f(g)),
  fold: f,
  inspect: () => `Box::(${f()})`,
});

export { Box };
