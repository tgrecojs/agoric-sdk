import { test as unknownTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeTracer } from '@agoric/internal';
import { E } from '@endo/eventual-send';

import { makeDriverContext, makeManagerDriver } from './driver.js';
import { makeNotifierFromSubscriber } from '@agoric/notifier';
import { setupServices } from './helpers.js';

/** @typedef {import('./driver.js').DriverContext & {}} Context */
/** @type {import('ava').TestFn<Context>} */
const test = unknownTest;

const trace = makeTracer('TestVC');

test.before(async t => {
  t.context = await makeDriverContext();
  console.log('leverageCycleManager:::::', t.context)
  trace(t, 'CONTEXT');
});

test('leveraged loan', async t => {
  const { aeth, run, ...ctx } = t.context;

  console.log({ctx,keys: Object.keys(t)})
  const md = await makeManagerDriver(t);

  const vd = await md.makeVaultDriver(aeth.make(100_000n));
  const { collateral, debt } = await E(vd).getCurrentBalances();

  t.deepEqual(collateral, aeth.make(100000n));

  const {
    vault: { subscriber, storagePath, description },
  } = await E(vd).getPublicTopics();

  const notifier = await E(vd).notification();
  const vaultNotifier = await makeNotifierFromSubscriber(subscriber);
  let firstNotification = await E(vaultNotifier).getUpdateSince();
  t.deepEqual(firstNotification.value.locked, aeth.make(100_000n));

  await E(vd).giveCollateral(500n, aeth);

  const secondNotification = await E(vaultNotifier).getUpdateSince(1);

  t.deepEqual(secondNotification.value.locked, aeth.make(100_500n));

  console.log({ context: t.context });
  t.log(ctx);
});

test('excessive loan', async t => {
  const { aeth, run } = t.context;
  const md = await makeManagerDriver(t);

  const threshold = 453n;
  await t.notThrowsAsync(
    md.makeVaultDriver(aeth.make(100n), run.make(threshold)),
  );

  await t.throwsAsync(
    md.makeVaultDriver(aeth.make(100n), run.make(threshold + 1n)),
    {
      message: /Proposed debt.*477n.*exceeds max.*476n.*for.*100n/,
    },
  );
});
