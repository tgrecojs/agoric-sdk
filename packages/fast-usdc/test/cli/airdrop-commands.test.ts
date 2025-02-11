/** global fetch */
import { Far, makeMarshal } from '@endo/marshal';
import anyTest, { type TestFn } from 'ava';
import { Command } from 'commander';
import { addOperatorCommands } from '../../src/cli/operator-commands.js';
import { flags } from '../../tools/cli-tools.js';
import { mockStream } from '../../tools/mock-io.js';
import { MockCctpTxEvidences } from '../fixtures.js';
import {
  fetchEnvNetworkConfig,
  makeSmartWalletKit,
} from '@agoric/client-utils';
import { outputActionAndHint } from '../../src/cli/bridge-action.js';
import { addAirdropCommands } from '../../src/cli/airdrop-commands.js';
// Utility functions
const isNull = obj => obj === null || obj === undefined;
const isObject = value => typeof value === 'object' && !isNull(value);
const createIndent = depth => '---'.repeat(depth);
const log = message => console.info(message);
const getInstance = instanceName => walletKit =>
  Promise.resolve(walletKit.agoricNames.instance[instanceName]);

const getBrand = brandName => walletKit =>
  Promise.resolve(walletKit.agoricNames.brand[brandName]);

const getInstanceAndBrand =
  ({ brandName, instanceName }) =>
  wk =>
    Promise.all([getInstance(instanceName)(wk), getBrand(brandName)(wk)]);
const handleFetchNetworkConfig = ({ env, fetch }) =>
  fetchEnvNetworkConfig({ env, fetch });

const handleMakeSmartWalletKit =
  ({ delay, fetch }) =>
  networkConfig =>
    makeSmartWalletKit({ delay, fetch }, networkConfig);

const makeClaimAirdropOffer = (
  { feeBrand, instanceName },
  { proof, tier, pubkey, id },
) => ({
  id,
  invitationSpec: {
    source: 'agoricContract',
    instancePath: [instanceName],
    callPipe: [['makeClaimTokensInvitation']],
  },
  proposal: {
    give: {
      Fee: {
        brand: feeBrand,
        value: 5n,
      },
    },
  },
  offerArgs: {
    proof,
    tier,
    pubkey,
  },
});

const trace = label => value => {
  console.log(label, '::::', value);
  return value;
};
const traceAsync = label => value => Promise.resolve(value).then(trace(label));

const composeM =
  method =>
  (...ms) =>
    ms.reduce((f, g) => x => g(x)[method](f));

const composePromises = composeM('then');

// Successfully
const collectPowers = config =>
  composePromises(
    trace('inspecting walletKit capabilities'),
    handleMakeSmartWalletKit(config),
    traceAsync('network config'),
    () => handleFetchNetworkConfig({ env: config.env, fetch: config.fetch }),
  );

// Main recursive function using functional composition
const inspectObject = (obj, depth = 0) =>
  // Convert object entries to array and reduce over them
  isNull(obj)
    ? log('null or undefined')
    : Object.entries(obj).reduce((_, [key, value]) => {
        const indent = createIndent(depth);
        log(`${indent}${key}:`);
        return isObject(value)
          ? inspectObject(value, depth + 1)
          : log(`${indent}  ${value}`);
      }, null);

// Alternative version using pipe-style composition
const pipe =
  (...fns) =>
  x =>
    fns.reduce((v, f) => f(v), x);

const inspectObjectPiped = (obj, depth = 0) => {
  if (isNull(obj)) {
    return log('null or undefined');
  }

  return pipe(Object.entries, entries =>
    entries.reduce((_, [key, value]) => {
      const indent = createIndent(depth);
      return pipe(
        () => log(`${indent}${key}:`),
        () =>
          isObject(value)
            ? inspectObjectPiped(value, depth + 1)
            : log(`${indent}  ${value}`),
      )();
    }, null),
  )(obj);
};

const offerArgs = {
  pubkey: 'AnEGbxH55aKu/9zIbgVDV2qXC43bpIqtZdHTKV8BAM58',
  tier: 0,
  proof: [
    {
      hash: '65841582aae8dcb596cb38ff196ac070f83bd019b879ed97041e6be416a1d385',
      direction: 'left',
    },
    {
      hash: 'd0bb415aaec20b82f17bb886d2c48ee7c3259af5010f53005641803aba7a2175',
      direction: 'right',
    },
    {
      hash: '6c745c21ba3edb5109aae76d9fd7a4a8dca6432966b4db8a18ddc9d9cb154580',
      direction: 'right',
    },
    {
      hash: 'f38a7b08ac5a9b5a25d50bf562bdfccde70bb54802cd7efb2ffe7f9d8def424d',
      direction: 'right',
    },
    {
      hash: '403f53a2a7b81f1323d66cc8a8965d5dbeba25cf77e731101eae8689fcb0bbee',
      direction: 'right',
    },
    {
      hash: 'd4f10c6b26ef2bbfb127e12fd1d98791d5b718286e230ab9b843d8ce8f41b87a',
      direction: 'right',
    },
    {
      hash: '64f6e4008ca2c1bb635da596d907c1370df8a24a0261f3af1b6bcf8905190ee1',
      direction: 'right',
    },
    {
      hash: '1d990892f1fe1f8d5c0af3664eb13b327776f961e6461384e323ebcb9921a14f',
      direction: 'right',
    },
    {
      hash: 'cf780e6e280c26d5c951eb9a42c1b1e0c07d30d414656d82f4ad9312605c341c',
      direction: 'right',
    },
    {
      hash: '702b3d244dc26e284ff0339ed0915a71f8ca5154e7e53b4066ecc41fc5b76da4',
      direction: 'right',
    },
    {
      hash: '4760036b289220fa586c87e0a3cfb78b124a5c4dc5e5d6227d2df4384b8c16b6',
      direction: 'right',
    },
  ],
};
// inspectObjectPiped(testObj);

const makeTestContext = () => {
  const program = new Command();
  program.exitOverride();
  const out = [] as string[];
  const err = [] as string[];

  const powers = collectPowers({
    fetch,
    env: { AGORIC_NET: 'xnet' },
    delay: () => 1234,
  })();
  const now = () => 1234;

  addAirdropCommands(program, {
    fetch,
    stdout: mockStream<typeof process.stdout>(out),
    stderr: mockStream<typeof process.stderr>(err),
    env: { AGORIC_NET: 'xnet' },
    now,
  });

  return { program, powers, out, err, now };
};

const test = anyTest as TestFn<Awaited<ReturnType<typeof makeTestContext>>>;
test.beforeEach(async t => (t.context = await makeTestContext()));

test('fast-usdc operator attest sub-command', async t => {
  const { program, out, err, powers: powersP } = t.context;

  const powers = await powersP;
  console.log('powers ::::', powers);
  console.log('----------------------------------');
  const claimArgs = harden(offerArgs);
  const { proof, pubkey, tier } = claimArgs;

  const stringProof = JSON.stringify(proof);

  const argv = [
    ...`node airdrop claim`.split(' '),
    ...flags({ proof: JSON.stringify(proof), pubkey, tier }),
  ];
  t.log(...argv);

  await program.parseAsync(argv);
  const { marshaller, agoricNames } = powers;

  const { IST } = agoricNames.brand;

  const action = marshaller.fromCapData(JSON.parse(out.join('')));

  t.deepEqual(action, {
    method: 'executeOffer',
    offer: {
      id: 'claim-1234',
      invitationSpec: {
        callPipe: [['makeClaimTokensInvitation']],
        instancePath: ['tribblesXnetDeployment'],
        source: 'agoricContract',
      },
      proposal: {
        give: {
          Fee: { brand: IST, value: 5n },
        },
      },
      offerArgs: { tier, pubkey, proof },
    },
  });
  // const trace = label => value => {
  //   console.log(label, ':::', value);
  //   return value;
  // };
  // const traverseObject = o => fn =>
  //   Object.fromEntries(Object.entries(action).map(fn));
  // inspectObject(action);
  // const object2 = Object.fromEntries(
  //   Object.entries(action).map(([key, val]) =>
  //     isObject(val)
  //       ? traverseObject(val)(trace('key + val'))
  //       : trace('key + val')([key, val]),
  //   ),
  // );

  // t.log({
  //   action,
  //   invitatioNSpec: traverseObject(action.offer.invitationSpec.invitationArgs)(
  //     trace('invitatioNSpec'),
  //   ),
  // });

  // t.is(
  //   err.join(''),
  //   'Now use `agoric wallet send ...` to sign and broadcast the offer.\n',
  // );
});
