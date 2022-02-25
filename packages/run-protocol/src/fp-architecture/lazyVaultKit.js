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
const Right = x => ({
  map: g => Right(g(x)),
  fold: (f, g) => Right(g(x)),
  inspect: () => `Right::(${x})`,
});

const Left = x => ({
  map: g => Left(x),
  fold: (f, g) => Left(f(x)),
  inspect: () => `Left::(${x})`,
});

const fromNull = x => (x !== null ? Right(x) : Left(x));
const tryCatch = f => {
  try {
    Right(f());
  } catch (err) {
    Left(err);
  }
};

const { fromNull, Right, Left, tryCatch } = Either();

const tryer = () => tryCatch(() => 10 > 9).map(x => x);
tryer(); // ?
// tryCatch(() => 10 > 9); // ?
const fn = () => !(10 > 9);

// ?

// ?
// ?
// ?
// ?

// .map(x => x) //?

Right(10)
  .map(x => x * 2) // ?
  .fold(
    x => x,
    y => y,
  ); // ?

Left(10)
  .map(x => x * 2)
  .fold(err => err);

// ?

const Box = f => ({
  map: g => Box(f(g)),
  fold: f,
  inspect: () => `Box::(${f()})`,
});

export { Box };
