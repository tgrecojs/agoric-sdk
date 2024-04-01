import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import path from 'path';

import bundleSource from '@endo/bundle-source';
import { E } from '@endo/eventual-send';
import { Far, GET_METHOD_NAMES } from '@endo/marshal';

import { buildManualTimer } from '@agoric/swingset-vat/tools/manual-timer.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { makeZoeForTest } from '../../../../tools/setup-zoe.js';
import { makeFakeVatAdmin } from '../../../../tools/fakeVatAdmin.js';
import { installationPFromSource } from '../../installFromSource.js';
import { setup } from '../../setupBasicMints.js';
import { makeStateMachine } from '../../../../src/contractSupport/stateMachine.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const root = `${dirname}/airdrop.js`;

const defaultDistributionArray = [
  { windowLength: 259_200n, tokenQuantity: 10_000n },
  { windowLength: 864_000n, tokenQuantity: 6_000n },
  { windowLength: 864_000n, tokenQuantity: 3_000n },
  { windowLength: 864_000n, tokenQuantity: 1_500n },
  { windowLength: 864_000n, tokenQuantity: 750n },
];
const verify = address => assert(address[0] !== 'a');

export const createDistributionConfig = (array = defaultDistributionArray) =>
  array.map(({ windowLength, tokenQuantity }, index) =>
    harden({
      windowLength,
      tokenQuantity,
      index,
      inDays: windowLength / 86_400n,
    }),
  );

harden(createDistributionConfig);

const airdropBehaviors = {};
const AIRDROP_STATES = {
  INITIALIZED: 'initialized',
  PREPARED: 'prepared',
  OPEN: 'claim-window-open',
  EXPIRED: 'claim-window-expired',
  CLOSED: 'claiming-closed',
  RESTARTING: 'restarting',
};
const { OPEN, EXPIRED, PREPARED, INITIALIZED, RESTARTING } = AIRDROP_STATES;

const startState = INITIALIZED;
const allowedTransitions = [
  [startState, [PREPARED]],
  [PREPARED, [OPEN]],
  [OPEN, [EXPIRED, RESTARTING]],
  [RESTARTING, [OPEN]],
  [EXPIRED, []],
];
const stateMachine = makeStateMachine(startState, allowedTransitions);

const hasSchedule = (schedule = []) => ({ schedule });
const createMerkleHash =
  ({ hash }) =>
  o => {
    const merkleRoot = hash;
    let percentCharged = 100;
    return {
      ...o,
      draw(percent) {
        const remaining = percentCharged - percent;
        percentCharged = remaining > 0 ? remaining : 0;
        return this;
      },
    };
  };

const makeTimer = (logFn, startTime) =>
  buildManualTimer(logFn, startTime, { eventLoopIteration });
test.beforeEach('setup', async t => {
  const {
    memeMint,
    memeIssuer,
    memes,
    moola,
    simoleans,
    bucksIssuer,
    bucksMint,
    bucks,
    zoe,
    brands,
    vatAdminState,
  } = setup();

  const TOTAL_SUPPLY = memes(10_000_000n);
  const AIRDROP_PAYMENT = memeMint.mintPayment(TOTAL_SUPPLY);
  const AIRDROP_PURSE = memeIssuer.makeEmptyPurse();
  AIRDROP_PURSE.deposit(AIRDROP_PAYMENT);
  const invitationIssuer = await E(zoe).getInvitationIssuer();
  const invitationBrand = await E(invitationIssuer).getBrand();

  // Pack the contract.
  const bundle = await bundleSource(root);
  vatAdminState.installBundle('b1-ownable-Airdrop', bundle);
  /** @type {Installation<import('./ownable-airdrop.js').start>} */
  const installation = await E(zoe).installBundleID('b1-ownable-Airdrop');
  const timer = makeTimer(t.log, 0n);
  const schedule = harden(createDistributionConfig());
  const instance = await E(zoe).startInstance(
    installation,
    undefined,
    harden({
      startTime: 10_000n,
      AirdropUtils: Far('AirdropUtils', {
        getSchedule() {
          return schedule;
        },
        getVerificationFn() {
          return x => verify(x);
        },
        getStateMachine() {
          return { stateMachine, states: AIRDROP_STATES };
        },
      }),
    }),
    harden({
      count: 3n,
      purse: AIRDROP_PURSE,
      timer,
    }),
    'c1-ownable-Airdrop',
  );

  // Alice will create and fund a call spread contract, and give the invitations
  // to Bob and Carol. Bob and Carol will promptly schedule collection of funds.
  // The spread will then mature at a low price, and carol will get paid.

  // Setup Alice
  const aliceBucksPayment = bucksMint.mintPayment(bucks(300n));
  // Setup Bob
  const bobBucksPurse = bucksIssuer.makeEmptyPurse();
  // Setup Carol
  const carolBucksPurse = bucksIssuer.makeEmptyPurse();

  // // underlying is 2 Simoleans, strike range is 30-50 (doubled)
  // const terms = harden({
  //   expiration: 2n,
  //   underlyingAmount: simoleans(2n),
  //   priceAuthority,
  //   strikePrice1: moola(60n),
  //   strikePrice2: moola(100n),
  //   settlementAmount: bucks(300n),
  //   timer: manualTimer,
  // });
  t.context = {
    instance,
    creatorFacet: instance.creatorFacet,
    publicFacet: instance.publicFacet,
    invitationIssuer,
    invitationBrand,
    zoe,
    timer,
    installation,
    bundle,
  };
});

test('zoe - ownable-Airdrop contract', async t => {
  const {
    creatorFacet: firstAirdrop,
    publicFacet: viewAirdrop,
    zoe,
    invitationIssuer,
    invitationBrand,
    installation,
    timer,
  } = t.context;

  await E(firstAirdrop).prepareAirdropCampaign();
  // await t.throwsAsync(
  //   // @ts-expect-error method of underlying that ownable doesn't allow
  //   E(firstAirdrop).toBeAttenuated(),
  //   {
  //     message:
  //       'target has no method "toBeAttenuated", has ["__getInterfaceGuard__","__getMethodNames__", "claim", "getInvitationCustomDetails","incr","makeTransferInvitation"]',
  //   },
  // );

  // the following tests could invoke `firstAirdrop` and `viewAirdrop`
  // synchronously. But we don't in order to better model the user
  // code that might be remote.
  await E(timer).advanceBy(2_300n);
  t.is(
    await E(viewAirdrop).getStatus(),
    AIRDROP_STATES.PREPARED,
    'Contract state machine should update from initialized to prepared upon successful startup.',
  );

  const methods = await E(firstAirdrop)[GET_METHOD_NAMES]();
  t.deepEqual(methods.length, 6);

  t.is(await E(firstAirdrop).incr(), 4n);

  t.deepEqual(await E(firstAirdrop).getInvitationCustomDetails(), {
    count: 4n,
  });
  await E(timer).advanceBy(11_000n);
  t.deepEqual(
    await E(viewAirdrop).getStatus(),
    AIRDROP_STATES.OPEN,
    `Contract state machine should update from ${AIRDROP_STATES.PREPARED} to ${AIRDROP_STATES.OPEN} when startTime is reached.`,
  );

  t.deepEqual(await E(firstAirdrop)[GET_METHOD_NAMES](), [
    '__getInterfaceGuard__',
    '__getMethodNames__',
    'claim',
    'getInvitationCustomDetails',
    'incr',
    'prepareAirdropCampaign',
  ]);

  t.is(await E(viewAirdrop).view(), 4n);

  t.is(await E(viewAirdrop).view(), 4n);
});
