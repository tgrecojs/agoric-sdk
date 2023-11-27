import '@agoric/zoe/exported.js';
import { test as unknownTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AssetKind, makeIssuerKit } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { makeManualPriceAuthority } from '@agoric/zoe/tools/manualPriceAuthority.js';

import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { makeScriptedPriceAuthority } from '@agoric/zoe/tools/scriptedPriceAuthority.js';
import { E } from '@endo/eventual-send';
import { SECONDS_PER_YEAR } from '../../../src/interest.js';
import { startVaultFactory } from '../../../src/proposals/econ-behaviors.js';
import '../../../src/vaultFactory/types.js';
import {
  getRunFromFaucet,
  setupElectorateReserveAndAuction,
} from './vaultFactoryUtils.js';

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

/** @typedef {import('../../../src/vaultFactory/vaultFactory').VaultFactoryContract} VFC */

const trace = makeTracer('TestVF', false);

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
 * NOTE: called separately by each test so zoe/priceAuthority don't interfere
 *
 * @param {import('ava').ExecutionContext<Context>} t
 * @param {NatValue[] | Ratio} priceOrList
 * @param {Amount | undefined} unitAmountIn
 * @param {import('@agoric/time/src/types').TimerService} timer
 * @param {RelativeTime} quoteInterval
 * @param {bigint} stableInitialLiquidity
 * @param {bigint} [startFrequency]
 */
const setupServices = async (
  t,
  priceOrList,
  unitAmountIn,
  timer = buildManualTimer(t.log, 0n, { eventLoopIteration }),
  quoteInterval = 1n,
  stableInitialLiquidity,
  startFrequency = undefined,
) => {
  const {
    zoe,
    run,
    aeth,
    interestTiming,
    minInitialDebt,
    referencedUi,
    rates,
  } = t.context;
  t.context.timer = timer;

  const runPayment = await getRunFromFaucet(t, stableInitialLiquidity);
  trace(t, 'faucet', { stableInitialLiquidity, runPayment });

  const { space } = await setupElectorateReserveAndAuction(
    t,
    // @ts-expect-error inconsistent types with withAmountUtils
    run,
    aeth,
    priceOrList,
    quoteInterval,
    unitAmountIn,
    { StartFrequency: startFrequency },
  );

  const { consume, produce } = space;

  const quoteIssuerKit = makeIssuerKit('quote', AssetKind.SET);
  // Cheesy hack for easy use of manual price authority
  const pa = Array.isArray(priceOrList)
    ? makeScriptedPriceAuthority({
        actualBrandIn: aeth.brand,
        actualBrandOut: run.brand,
        priceList: priceOrList,
        timer,
        quoteMint: quoteIssuerKit.mint,
        unitAmountIn,
        quoteInterval,
      })
    : makeManualPriceAuthority({
        actualBrandIn: aeth.brand,
        actualBrandOut: run.brand,
        initialPrice: priceOrList,
        timer,
        quoteIssuerKit,
      });

  produce.priceAuthority.resolve(pa);

  const {
    installation: { produce: iProduce },
  } = space;
  iProduce.VaultFactory.resolve(t.context.installation.VaultFactory);
  iProduce.liquidate.resolve(t.context.installation.liquidate);
  await startVaultFactory(
    space,
    { interestTiming, options: { referencedUi } },
    minInitialDebt,
  );

  const governorCreatorFacet = E.get(
    consume.vaultFactoryKit,
  ).governorCreatorFacet;
  /** @type {Promise<VaultFactoryCreatorFacet>} */
  const vaultFactoryCreatorFacetP = E.get(consume.vaultFactoryKit).creatorFacet;
  const reserveCreatorFacet = E.get(consume.reserveKit).creatorFacet;
  const reservePublicFacet = E.get(consume.reserveKit).publicFacet;
  const reserveKit = { reserveCreatorFacet, reservePublicFacet };

  // Add a vault that will lend on aeth collateral
  /** @type {Promise<VaultManager>} */
  const aethVaultManagerP = E(vaultFactoryCreatorFacetP).addVaultType(
    aeth.issuer,
    'AEth',
    rates,
  );
  /**
   * @type {[
   *   any,
   *   VaultFactoryCreatorFacet,
   *   VFC['publicFacet'],
   *   VaultManager,
   *   PriceAuthority,
   *   CollateralManager,
   * ]}
   */
  const [
    governorInstance,
    vaultFactory, // creator
    vfPublic,
    aethVaultManager,
    priceAuthority,
    aethCollateralManager,
  ] = await Promise.all([
    E(consume.agoricNames).lookup('instance', 'VaultFactoryGovernor'),
    vaultFactoryCreatorFacetP,
    E.get(consume.vaultFactoryKit).publicFacet,
    aethVaultManagerP,
    consume.priceAuthority,
    E(aethVaultManagerP).getPublicFacet(),
  ]);
  trace(t, 'pa', {
    governorInstance,
    vaultFactory,
    vfPublic,
    priceAuthority: !!priceAuthority,
  });


  const { g, v } = {
    g: {
      governorInstance,
      governorPublicFacet: E(zoe).getPublicFacet(governorInstance),
      governorCreatorFacet,
    },
    v: {
      // name for backwards compatiiblity
      lender: E(vfPublic).getCollateralManager(aeth.brand),
      vaultFactory,
      vfPublic,
      aethVaultManager,
      aethCollateralManager,
    },
  };

  console.log('at end of setupServices:::', { priceAuthority });

  return {
    zoe,
    governor: g,
    vaultFactory: v,
    runKit: { issuer: run.issuer, brand: run.brand },
    priceAuthority,
    reserveKit,
    space,
  };
};

[1,2,3,5].filter((x, i) => i % 2 === 0)
let generateArrayWithMap = (length, mapFunction) => [...new Array(length)].map((
  _, index) => mapFunction(index));

let priceList = [9, 10, 11];

// 1. creating a static price list that iterates over values
// 2. mimics the same behavior as oracle with exception of being *scripted*

const generateMockMarketData = generateArrayWithMap(5, index => index * 3)



/**
 * NOTE: called separately by each test so zoe/priceAuthority don't interfere
 *
 * @param {import('ava').ExecutionContext<Context>} t
 * @param {NatValue[] | Ratio} priceOrList
 * @param {Amount | undefined} unitAmountIn
 * @param {import('@agoric/time/src/types').TimerService} timer
 * @param {RelativeTime} quoteInterval
 * @param {bigint} stableInitialLiquidity
 * @param {bigint} [startFrequency]
 */
const setupServicesAlt = async (
  t,
  priceOrList,
  unitAmountIn,
  timer = buildManualTimer(t.log, 0n, { eventLoopIteration }),
  quoteInterval = 1n,
  stableInitialLiquidity,
  startFrequency = undefined,
) => {
  const {
    zoe,
    run,
    aeth,
    interestTiming,
    minInitialDebt,
    referencedUi,
    rates,
  } = t.context;
  console.log({run})
  t.context.timer = timer;

  const runPayment = await getRunFromFaucet(t, stableInitialLiquidity);
  trace(t, 'faucet', { stableInitialLiquidity, runPayment });

  const { space } = await setupElectorateReserveAndAuction(
    t,
    // @ts-expect-error inconsistent types with withAmountUtils
    run,
    aeth,
    priceOrList,
    quoteInterval,
    unitAmountIn,
    { StartFrequency: startFrequency },
  );

  const { consume, produce } = space;

  const quoteIssuerKit = makeIssuerKit('quote', AssetKind.SET);
  // Cheesy hack for easy use of manual price authority
  console.log({ priceOrList });
  const pa = Array.isArray(priceOrList)
    ? makeScriptedPriceAuthority({
        actualBrandIn: aeth.brand,
        actualBrandOut: run.brand,
        priceList: priceOrList,
        timer,
        quoteMint: quoteIssuerKit.mint,
        unitAmountIn,
        quoteInterval,
      })
    : makeManualPriceAuthority({
        actualBrandIn: aeth.brand,
        actualBrandOut: run.brand,
        initialPrice: priceOrList,
        timer,
        quoteIssuerKit,
      });
  produce.priceAuthority.resolve(pa);

  const {
    installation: { produce: iProduce },
  } = space;
  iProduce.VaultFactory.resolve(t.context.installation.VaultFactory);
  iProduce.liquidate.resolve(t.context.installation.liquidate);
  await startVaultFactory(
    space,
    { interestTiming, options: { referencedUi } },
    minInitialDebt,
  );

  const governorCreatorFacet = E.get(
    consume.vaultFactoryKit,
  ).governorCreatorFacet;
  /** @type {Promise<VaultFactoryCreatorFacet>} */
  const vaultFactoryCreatorFacetP = E.get(consume.vaultFactoryKit).creatorFacet;
  const reserveCreatorFacet = E.get(consume.reserveKit).creatorFacet;
  const reservePublicFacet = E.get(consume.reserveKit).publicFacet;
  const reserveKit = { reserveCreatorFacet, reservePublicFacet };

  // Add a vault that will lend on aeth collateral
  /** @type {Promise<VaultManager>} */
  const aethVaultManagerP = E(vaultFactoryCreatorFacetP).addVaultType(
    aeth.issuer,
    'AEth',
    rates,
  );
  /**
   * @type {[
   *   any,
   *   VaultFactoryCreatorFacet,
   *   VFC['publicFacet'],
   *   VaultManager,
   *   PriceAuthority,
   *   CollateralManager,
   * ]}
   */
  const [
    governorInstance,
    vaultFactory, // creator
    vfPublic,
    aethVaultManager,
    priceAuthority,
    aethCollateralManager,
  ] = await Promise.all([
    E(consume.agoricNames).lookup('instance', 'VaultFactoryGovernor'),
    vaultFactoryCreatorFacetP,
    E.get(consume.vaultFactoryKit).publicFacet,
    aethVaultManagerP,
    consume.priceAuthority,
    E(aethVaultManagerP).getPublicFacet(),
  ]);

  trace(t, 'pa', {
    governorInstance,
    vaultFactory,
    vfPublic,
    priceAuthority: !!priceAuthority,
  });

  const { g, v } = {
    g: {
      governorInstance,
      governorPublicFacet: E(zoe).getPublicFacet(governorInstance),
      governorCreatorFacet,
    },
    v: {
      // name for backwards compatiiblity
      lender: E(vfPublic).getCollateralManager(aeth.brand),
      vaultFactory,
      vfPublic,
      aethVaultManager,
      aethCollateralManager,
      quoteIssuer: () => quoteIssuerKit.issuer
    },
  };

  console.log({priceAuthority})
  const quoteNotifier = (brandOut) => amountIn => E(pa).makeQuoteNotifier(amountIn, brandOut)
  const quoteIssuer = await E(pa).getQuoteIssuer(aeth.brand, run.brand)
  const getCurrentPriceQuote = pa => (amountIn, brandOut) => E(pa).quoteGiven(amountIn, brandOut)
  const getQuoteGiven = amountIn => getCurrentPriceQuote(priceAuthority)(amountIn, run.brand);

  return {
    zoe,
    governor: g,
    vaultFactory: v,
    runKit: { issuer: run.issuer, brand: run.brand },
    priceAuthority,
    quoteAEthInRun: quoteNotifier(run.brand),
    quoteIssuer,
    getQuoteGiven,
    reserveKit,
    space,
    timer
  };
};

export { setupServices, setupServicesAlt };
