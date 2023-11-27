/* eslint-disable prettier/prettier */
import '@agoric/zoe/exported.js';
import { test as unknownTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import bundleSource from '@endo/bundle-source';
import { E } from '@endo/eventual-send';
import { resolve as importMetaResolve } from 'import-meta-resolve';

import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { assert } from '@agoric/assert';
import { allValues, makeTracer, objectMap } from '@agoric/internal';
import { Far, deeplyFulfilled } from '@endo/marshal';
import {
  ceilMultiplyBy,
  makeRatio,
} from '@agoric/zoe/src/contractSupport/index.js';
import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { setupServicesAlt, setupServices } from './helpers.js';
import { defaultParamValues, legacyOfferResult } from '../vaultFactoryUtils.js';
import { calculateCurrentDebt } from '../../../src/interest-math.js';
import { withAmountUtils } from '../../supports.js';
import { SECONDS_PER_YEAR } from '../../../src/interest.js';
import { maxDebtForVault } from '../../../src/vaultFactory/math.js';
import { subscriptionTracker } from '../../metrics.js';
import { defaultFeeIssuerConfig } from './driver.js';
import { createNATArray, createPriceData } from './utils.js';

const vaultRoot = '../vault-contract-wrapper.js';
const trace = makeTracer('TestVault', false);
/**
 * @typedef {Record<string, any> & {
 *   aeth: IssuerKit & import('../../supports.js').AmountUtils;
 *   run: IssuerKit & import('../../supports.js').AmountUtils;
 *   bundleCache: Awaited<ReturnType<typeof unsafeMakeBundleCache>>;
 *   rates: VaultManagerParamValues;
 *   interestTiming: InterestTiming;
 *   zoe: ZoeService;
 * }} Context
 */
/** @type {import('ava').TestFn<Context>} */
const test = unknownTest;

const contractRoots = {
  faucet: './test/vaultFactory/faucet.js',
  VaultFactory: './src/vaultFactory/vaultFactory.js',
  reserve: './src/reserve/assetReserve.js',
  auctioneer: './src/auction/auctioneer.js',
};

/** @typedef {import('../../../src/vaultFactory/vaultFactory').VaultFactoryContract} VFC */

const SECONDS_PER_DAY = SECONDS_PER_YEAR / 365n;
const SECONDS_PER_WEEK = SECONDS_PER_DAY * 7n;

// Define locally to test that vaultFactory uses these values
export const Phase = /** @type {const} */ ({
  ACTIVE: 'active',
  LIQUIDATING: 'liquidating',
  CLOSED: 'closed',
  LIQUIDATED: 'liquidated',
  TRANSFER: 'transfer',
});

/**
 * The properties will be asssigned by `setTestJig` in the contract.
 *
 * @typedef {object} TestContext
 * @property {ZCF} zcf
 * @property {ZCFMint} stableMint
 * @property {IssuerKit} collateralKit
 * @property {Vault} vault
 * @property {Function} advanceRecordingPeriod
 * @property {Function} setInterestRate
 */
let testJig;

/** @param {TestContext} jig */
const setJig = jig => {

  testJig = jig
};

const { zoe, feeMintAccessP: feeMintAccess } = await setUpZoeForTest({
  setJig,
  useNearRemote: true,
});

test.before(async t => {
  const { zoe, feeMintAccessP } = await setUpZoeForTest({setJig, feeIssuerConfig: defaultFeeIssuerConfig});
  console.log({zoe, feeMintAccessP})
  const stableIssuer = await E(zoe).getFeeIssuer();
  const stableBrand = await E(stableIssuer).getBrand();
  console.log({zoe, stableIssuer})

  // @ts-expect-error missing mint
  const run = withAmountUtils({ issuer: stableIssuer, brand: stableBrand });
  const aeth = withAmountUtils(
    makeIssuerKit('aEth', AssetKind.NAT, { decimalPlaces: 6 }),
  );

  const bundleCache = await unsafeMakeBundleCache('./bundles/'); // package-relative
  // note that the liquidation might be a different bundle name
  const bundles = await allValues({
    faucet: bundleCache.load(contractRoots.faucet, 'faucet'),
    VaultFactory: bundleCache.load(contractRoots.VaultFactory, 'VaultFactory'),
    auctioneer: bundleCache.load(contractRoots.auctioneer, 'auction'),
    reserve: bundleCache.load(contractRoots.reserve, 'reserve'),
  });
  const installation = objectMap(bundles, bundle => E(zoe).install(bundle));

  const feeMintAccess = await feeMintAccessP;
  const contextPs = {
    zoe,
    feeMintAccess,
    bundles,
    installation,
    electorateTerms: undefined,
    interestTiming: {
      chargingPeriod: 2n,
      recordingPeriod: 6n,
    },
    minInitialDebt: 50n,
    referencedUi: undefined,
    rates: defaultParamValues(run.brand),
  };
  const frozenCtx = await deeplyFulfilled(harden(contextPs));
  t.context = {
    ...frozenCtx,
    bundleCache,
    aeth,
    run,
  };
  trace(t, 'CONTEXT');
});

test('interest on many vaults', async t => {
  const { zoe, aeth, run, rates: defaultRates } = t.context;
 const tObject = t;

 console.log({tObject,defaultRates })
  const invitationIssuer = await E(zoe).getInvitationIssuer();
  console.log({ t: t.context });
  const rates = {
    ...defaultRates,
    interestRate: makeRatio(5n, run.brand),
  };
  t.context.rates = rates;
  // charging period is 1 week. Clock ticks by days
  t.context.interestTiming = {
    chargingPeriod: SECONDS_PER_WEEK,
    recordingPeriod: SECONDS_PER_WEEK,
  };
  
  const manualTimer = buildManualTimer(t.log, 0n, {
    timeStep: SECONDS_PER_DAY,
    eventLoopIteration,
  });
  
  const priceData = createPriceData(10)
  .map(x => (x).toFixed())
  .map(x => BigInt(x));

  t.is(priceData,priceData.sort());

  const services = await setupServicesAlt(
    t,
   priceData,
    aeth.make(90n),
    manualTimer,
    SECONDS_PER_DAY,
    500n,
    // manual timer steps with granularity of a day, which confuses the auction
    52n * 7n * 24n * 3600n,
  );

  const {timer,quoteAEthInRun,quoteIssuer,getQuoteGiven, priceAuthority: pa} = services;


  const asserter = (actual, expected, msg = '') => t.deepEqual(actual, expected, `${actual} should equal ${expected} `)

  const head = ([fst, ...snd]) => fst

  const parseQuoteAmount = ({brand, value = []}) => ({
    brand,
    ...head(value)
  })
  
  const firstPriceQuoteUpdater = quoteAEthInRun(aeth.make(1n))
  const actualFirstUpdate = await E(firstPriceQuoteUpdater).getUpdateSince()

  asserter(actualFirstUpdate.updateCount, 1n, 'upon initial update')


asserter(!actualFirstUpdate.value.quoteAmount === false, true, 'when checked for a quoteAmount')
asserter(!actualFirstUpdate.value.quotePayment === false, true, 'when checked for a quotePayment')
asserter(parseQuoteAmount(actualFirstUpdate.value.quoteAmount), true, 'when checking the quoteAmount')


  const firstQuotePayment = await getQuoteGiven(aeth.make(10n))


  t.is(await E(quoteIssuer).getAmountOf(firstQuotePayment), await firstPriceQuoteUpdater, 'getQuoteGiven should return the correct value')
  /**
   * ## 
   */

  

  const firstQuote = await E(pa).quoteGiven(aeth.make(1n), run.brand);
  console.log({firstQuote})
  await manualTimer.tickN(2);

  const secondQuote = await E(pa).quoteGiven(aeth.make(1n), run.brand);
  console.log({secondQuote})

  const initialQuotePayment = await getQuoteGiven(aeth.make(100n))
  const getQuotePaymentValue =  x =>  E(quoteIssuer).getAmountOf(x.quotePayment)


  t.is(await E(quoteIssuer).getAmountOf(initialQuotePayment), firstQuote)

  await E(timer).tickN(10)
  
  let currentTimestamp = await E(timer).getCurrentTimestamp();
  console.log({timer, currentTimestamp})

  console.log({services, quoteAEthInRun})


  t.is(pa, await pa);
  const { aethCollateralManager, vaultFactory, vfPublic, ...restc } =
    services.vaultFactory;

    /**
     *    updateCount: 1n,
  -   value: {
  -     quoteAmount: {
  -       brand: Object @Alleged: quote brand {},
  -       value: [
  -         Object { … },
  -       ],
  -     },
  -     quotePayment: Object @Alleged: quote payment {},
  -   },
     */

  const getValue = ({value}) => value;
  const getQuoteAmount = ({quoteAmount}) => quoteAmount;
  const getQuotePayment = ({quotePayment}) => quotePayment;
  const compose = (...fns) => initial => fns.reduceRight((val, fn) => fn(val), initial)
  // const parsePriceQuote = (priceQuote = {}) => {
  //   value: 
  // }
  // Create a loan for Alice for 4700 Minted with 1100 aeth collateral
  const defaultCollateralAmount = aeth.make(1100n);
  const defaultIstWanted = run.make(4700n);

  const makeAEthQuote = await quoteAEthInRun(defaultCollateralAmount)

  const {value:{quoteAmount:qa1,quotePayment:qp1}} = await E(makeAEthQuote).getUpdateSince();

  const isValue = obj => !obj.value ? obj : getValue(obj)
  console.log('initialQuote::', { qa1 })
  t.deepEqual(qa1, await E(quoteIssuer).getAmountOf(qp1))
  const defaultOfferArgs = {
    proposal: {
      give: { Collateral: defaultCollateralAmount },
      want: { Minted: defaultIstWanted },
    },
    payment: {
      Collateral: aeth.mint.mintPayment(defaultCollateralAmount),
    },
  };


  const handleMakeVault = (
    invitation,
    proposal = defaultOfferArgs.proposal,
    payment = defaultOfferArgs.payment,
  ) => E(zoe).offer(invitation, harden(proposal), harden(payment));

  const testInvitationLiveliness = async (t, invitation, proposal, payment) => {
    t.is(await E(invitationIssuer).isLive(invitation), true);
    /** @type {UserSeat<VaultKit>} */
    const vaultSeat = await handleMakeVault(invitation, proposal, payment);
    t.is(
      await E(invitationIssuer).isLive(invitation),
      false,
      'Invitation should no longer be lived after being used.',
    );
    return vaultSeat;
  };

  const getCollateralManager = (collateralBrand, publicFacet = vfPublic) =>
    E(publicFacet).getCollateralManager(collateralBrand);

  const setupVaultInvittions = () =>
    E(aethCollateralManager).makeVaultInvitation();

  const aliceAEthInvitation = setupVaultInvittions();
  t.is(await E(invitationIssuer).isLive(aliceAEthInvitation), true);

  // t.is(await E(invitationIssuer).isLive(E(E(vfPublic).getCollateralManager(aeth.brand)).makeVaultInvitation()), true)
  /** @type {UserSeat<VaultKit>} */
  const aliceVaultSeat = await testInvitationLiveliness(
    t,
    aliceAEthInvitation,
    defaultOfferArgs.proposal,
    defaultOfferArgs.payment,
  );

  const {
    vault: aliceVault,
    publicNotifiers: { vault: aliceNotifier },
  } = await legacyOfferResult(aliceVaultSeat);

  const {vault:aliceVaultTopic} = await E(aliceVault).getPublicTopics();

  const m = await subscriptionTracker(t, aliceVaultTopic);

  let lastOne = await m.getLastNotif()


  console.log({lastOne})
  const debtAmount = await E(aliceVault).getCurrentDebt();
  const fee = ceilMultiplyBy(defaultIstWanted, rates.mintFee);
  t.deepEqual(
    debtAmount,
    AmountMath.add(defaultIstWanted, fee),
    'vault lent 4700 Minted + fees',
  );

  const { Minted: lentAmount } = await E(aliceVaultSeat).getFinalAllocation();
  const proceeds = await E(aliceVaultSeat).getPayouts();
  t.deepEqual(lentAmount, defaultIstWanted, 'received 4700 Minted');

  await manualTimer.tickN(4);
  
  await handleMakeVault(E(aliceVault).makeAdjustBalancesInvitation(), {
    give: { Collateral: aeth.make(1_000_000n) },
    },
  {
    Collateral: aeth.mint.mintPayment(aeth.make(1_000_000n)),
  })

  console.log({aliceVaultTopic})
  const runLent = await proceeds.Minted;
  t.truthy(
    AmountMath.isEqual(
      await E(run.issuer).getAmountOf(runLent),
      run.make(4700n),
    ),
  );

  const bobAEthInvitation = setupVaultInvittions();

  // Create a loan for Bob for 3200 Minted with 800 aeth collateral
  const bobCollateralAmount = aeth.make(800n);
  const bobWantMinted = run.make(3200n);

  const bobProposal = {
    give: { Collateral: bobCollateralAmount },
    want: { Minted: bobWantMinted },
  };

  /** @type {UserSeat<VaultKit>} */
  const bobVaultSeat = await testInvitationLiveliness(
    t,
    bobAEthInvitation,
    bobProposal,
    {
      Collateral: aeth.mint.mintPayment(bobCollateralAmount),
    },
  );

  const {
    vault: bobVault,
    publicNotifiers: { vault: bobNotifier },
  } = await legacyOfferResult(bobVaultSeat);

  const bobDebtAmount = await E(bobVault).getCurrentDebt();
  const bobFee = ceilMultiplyBy(bobWantMinted, rates.mintFee);
  t.deepEqual(
    bobDebtAmount,
    AmountMath.add(bobWantMinted, bobFee),
    'vault lent 3200 Minted + fees',
  );

  const { Minted: bobLentAmount } = await E(bobVaultSeat).getFinalAllocation();
  const bobProceeds = await E(bobVaultSeat).getPayouts();
  t.deepEqual(bobLentAmount, bobWantMinted, 'received 4700 Minted');

  const bobRunLent = await bobProceeds.Minted;
  t.truthy(
    AmountMath.isEqual(
      await E(run.issuer).getAmountOf(bobRunLent),
      run.make(3200n),
    ),
  );

  // { chargingPeriod: weekly, recordingPeriod: weekly }
  // Advance 8 days, past one charging and recording period
  await manualTimer.tickN(8);

  const publicTopics = await E(aethCollateralManager).getPublicTopics();
  const assetUpdate = (await E(publicTopics.asset.subscriber).subscribeAfter())
    .head;

  const aliceUpdate = await E(aliceNotifier).getUpdateSince();
  const bobUpdate = await E(bobNotifier).getUpdateSince();

  // 160n is initial fee. interest is ~3n/week. compounding is in the noise.
  const bobAddedDebt = 160n + 3n;
  t.deepEqual(
    calculateCurrentDebt(
      bobUpdate.value.debtSnapshot.debt,
      bobUpdate.value.debtSnapshot.interest,
      assetUpdate.value.compoundedInterest,
    ),
    run.make(3200n + bobAddedDebt),
  );

  // 236 is the initial fee. Interest is ~4n/week
  const aliceAddedDebt = 236n + 4n;
  t.deepEqual(
    calculateCurrentDebt(
      aliceUpdate.value.debtSnapshot.debt,
      aliceUpdate.value.debtSnapshot.interest,
      assetUpdate.value.compoundedInterest,
    ),
    run.make(4700n + aliceAddedDebt),
    `should have collected ${aliceAddedDebt}`,
  );
  // but no change to the snapshot
  t.deepEqual(aliceUpdate.value.debtSnapshot, {
    debt: run.make(4935n),
    interest: makeRatio(100n, run.brand, 100n),
  });

  const rewardAllocation = await E(vaultFactory).getRewardAllocation();
  const rewardRunCount = aliceAddedDebt + bobAddedDebt;
  t.is(
    rewardAllocation.Minted.value,
    rewardRunCount,
    // reward includes 5% fees on two loans plus 1% interest three times on each
    `Should be ${rewardRunCount}, was ${rewardAllocation.Minted.value}`,
  );

  // try opening a vault that can't cover fees
  /** @type {UserSeat<VaultKit>} */
  const caroleVaultSeat = await E(zoe).offer(
    E(E(vfPublic).getCollateralManager(aeth.brand)).makeVaultInvitation(),
    harden({
      give: { Collateral: aeth.make(200n) },
      want: { Minted: run.make(0n) }, // no debt
    }),
    harden({
      Collateral: aeth.mint.mintPayment(aeth.make(200n)),
    }),
  );
  await t.throwsAsync(E(caroleVaultSeat).getOfferResult());

  // Advance another 7 days, past one charging and recording period
  await manualTimer.tickN(8);

  // open a vault when manager's interest already compounded
  const wantedRun = 1_000n;
  /** @type {UserSeat<VaultKit>} */
  const danVaultSeat = await E(zoe).offer(
    E(E(vfPublic).getCollateralManager(aeth.brand)).makeVaultInvitation(),
    harden({
      give: { Collateral: aeth.make(2_000n) },
      want: { Minted: run.make(wantedRun) },
    }),
    harden({
      Collateral: aeth.mint.mintPayment(aeth.make(2_000n)),
    }),
  );
  const {
    vault: danVault,
    publicNotifiers: { vault: danNotifier },
  } = await legacyOfferResult(danVaultSeat);
  const danActualDebt = wantedRun + 50n; // includes fees
  t.is((await E(danVault).getCurrentDebt()).value, danActualDebt);
  const normalizedDebt = (await E(danVault).getNormalizedDebt()).value;
  t.true(
    normalizedDebt < danActualDebt,
    `Normalized debt ${normalizedDebt} must be less than actual ${danActualDebt} (after any time elapsed)`,
  );
  t.is((await E(danVault).getNormalizedDebt()).value, 1_048n);
  const danUpdate = await E(danNotifier).getUpdateSince();
  // snapshot should equal actual since no additional time has elapsed
  const { debtSnapshot: danSnap } = danUpdate.value;
  t.is(danSnap.debt.value, danActualDebt);
});
// test('bad collateral', async t => {
//     const { creatorSeat: offerKit } = await helperContract;

//     console.log('offerKit::::', { offerKit, helperContract });
//     const { stableMint, collateralKit, vault } = testJig;

//     // Our wrapper gives us a Vault which holds 50 Collateral, has lent out 70
//     // Minted (charging 3 Minted fee), which uses an automatic market maker that
//     // presents a fixed price of 4 Minted per Collateral.
//     await E(offerKit).getOfferResult();
//     const { brand: collateralBrand } = collateralKit;
//     const { brand: stableBrand } = stableMint.getIssuerRecord();

//     const cf = (await helperContract).creatorFacet;

//     const invitationIssuer = await E(zoe).getInvitationIssuer();
//     const makeIstInviation = await E(cf).makeAdjustBalancesInvitation();

//     t.deepEqual(await E(invitationIssuer).isLive(makeIstInviation), true);
//     console.log(
//         'helperContract::creatorSeat',
//         (await helperContract).creatorSeat,
//     );
//     console.log('helperContract::makeIstInviation', makeIstInviation);
//     console.log('insopdect paymnet:::');
//     t.deepEqual(
//         vault.getCollateralAmount(),
//         AmountMath.make(collateralBrand, 50n),
//         'vault should hold 50 Collateral',
//     );
//     t.deepEqual(
//         vault.getCurrentDebt(),
//         AmountMath.make(stableBrand, 74n),
//         'borrower owes 74 Minted',
//     );

//     const collateralAmount = AmountMath.make(collateralBrand, 2n);

//     // adding the wrong kind of collateral should be rejected
//     const { mint: wrongMint, brand: wrongBrand } = makeIssuerKit('wrong');
//     const wrongAmount = AmountMath.make(wrongBrand, 2n);
//     const p = E(zoe).offer(
//         vault.makeAdjustBalancesInvitation(),
//         harden({
//             give: { Collateral: collateralAmount },
//             want: {},
//         }),
//         harden({
//             Collateral: wrongMint.mintPayment(wrongAmount),
//         }),
//     );
//     try {
//         await p;
//         t.fail('not rejected when it should have been');
//     } catch (e) {
//         t.truthy(true, 'yay rejection');
//     }
//     // p.then(_ => console.log('oops passed'),
//     //       rej => console.log('reg', rej));
//     // t.rejects(p, / /, 'addCollateral requires the right kind', {});
//     // t.throws(async () => { await p; }, /was not a live payment/);
// });
