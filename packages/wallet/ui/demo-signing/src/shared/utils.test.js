import { Either, IOx, Maybe } from 'monio';
import test from 'tape';
import { makeChainConfig } from '../features/keplr/keplr-ledger-demo.js';
import { htmlString, $ } from '../markup.js';
import { setupTape as testFeature } from '../test/utils.js';

import {
  genArray,
  id,
  validateButtonElement,
  deepEqualityCheck,
  head,
} from './utils.js';

const mutiply = x => y => x * y;
const square = x => mutiply(x)(x);
const safeProp = propName => obj => Maybe.from(obj[propName]);
const safeChainConfig = config => Maybe.from(config);
const safeChainId = safeProp('chainId');
const safeChainRpc = safeProp('rpc');
const defaultTestArray = genArray(100, x => square(x)); // ?

test('HTMLInputElement', async t => {
  const actual = $('<body><h2>Yooo</h2></body>').html().trim();
  t.deepEquals(
    actual,
    '<body><h2>Yooo</h2></body>',
    'should return the correct output give an large array',
  );
  await 'done';
});

testFeature({
  componentName: 'head()',
  given: 'no arguments',
  should: 'return undefined',
  actual: head(),
  expected: undefined,
});
testFeature({
  componentName: 'head()',

  given: 'an array of numbers',
  should: 'return the 1st item in the array',
  actual: head(),
  expected: undefined,
});

test(`head:: happy path`, async t => {
  const actual = head(defaultTestArray.slice(1));
  const expected = defaultTestArray[1];
  t.deepEqual(actual, expected, 'should return the first element');
  t.deepEqual(head([1]), 1, 'should properly handle an array of length 1');
  t.deepEqual(
    head(genArray(1000 * 1000 * 10, x => x + 1)),
    1,
    'should return the correct output give an large array',
  );
  t.deepEqual(
    head(),
    undefined,
    'should return the default args if given no arguments',
  );

  t.deepEqual(head(), undefined, 'should properly handle empty array');
  await 'done';
});

test('safeChainConfig', async assert => {
  const actual = makeChainConfig();
  assert.deepEquals(actual, {}, 'given no args should reutnr the defaults');

  await 'done';
});
