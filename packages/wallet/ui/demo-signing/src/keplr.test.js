import { load } from 'cheerio';
import { Maybe } from 'monio';
import test from 'tape';
import { makeChainConfig, localChainInfo } from './features/keplr/keplr-ledger-demo.js';
import { getText, $ } from './markup.js';

const mutiply = x => y => x * y;
const square = x => mutiply(x)(x);
const safeProp = propName => obj => Maybe.from(obj[propName]);
const safeChainConfig = config => Maybe.from(config);

test('makeChainConfig', async assert => {
  const actual = makeChainConfig({});
  assert.deepEquals(
    actual,
    localChainInfo,
    'given no arguments, returns the default chain config',
  );
  await 'done';
});


test('makeChainConfig', async assert => {
  const testApi = '192.0.0.1:8545';
  const actual = makeChainConfig({rpc: testApi});
  assert.deepEquals(
    actual.rpc,
    testApi,
    'given a new rpc url should produce the correct output',
  );
  await 'done';
});

// test('ui components :: button', async assert => {
//   const root = $('button');
//   const actual = root;
//   assert.deepEqual(
//     actual,
//     '',
//     'should return the correct output give an large array',
//   );
//   await 'done';
// });
