/* global __dirname */
// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies

import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import '@agoric/zoe/exported';

import { E } from '@agoric/eventual-send';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin';
import { makeLoopback } from '@agoric/captp';
import { makeZoe } from '@agoric/zoe';
import bundleSource from '@agoric/bundle-source';
import { makeIssuerKit, AmountMath, AssetKind } from '@agoric/ertp';

import { assert } from '@agoric/assert';
import {
  acceptedBrandNames,
  leastAuthorityLendingPoolBrands,
  issuerKeywordRecord,
  leastAuthorityLendingPoolBrands as collateralTypes,
} from '../index.test';
import { makeTracer } from '../../../test/utils/tracer';
import { setupContract } from '../../../test/utils/setupContract';

const lendingPoolWrapper = '../index.js';
const trace = makeTracer('TestVault');

/**
 * These properties will be asssigned by `setJig` in the contract.
 *
 * @typedef {Object} TestContext
 * @property {ContractFacet} zcf
 * @property {ZCFMint} laTokenMint
 * @property {Issuer} collateralKits
 *
 * */

/* @type {TestContext} */
let testJig;
const setJig = jig => {
  testJig = jig;
};

const { makeFar, makeNear: makeRemote } = makeLoopback('zoeTest');
const head = arr => {
  const [first, ...rest] = arr;
  return first;
};
/** @type {ERef<ZoeService>} */
const zoe = makeFar(makeZoe(makeFakeVatAdmin(setJig, makeRemote).admin));
trace('makeZoe');
/**
 * @param {ERef<ZoeService>} zoeP
 * @param {string} sourceRoot
 */
async function launch(zoeP, sourceRoot) {
  const mockZoe = await zoeP;
  trace('MOCK ZOE INSTANCE', mockZoe);

  const contractBundle = await bundleSource(require.resolve(sourceRoot));
  const installation = await E(zoeP).install(contractBundle);
  const instance = await E(zoeP).startInstance(
    installation,
    issuerKeywordRecord,
    {
      acceptedLiquidity: collateralTypes,
    },
  );
  const testCollateralKit = head(collateralTypes);
  trace('testJigInstance', mockZoe);
  const { brand, issuer, mint } = makeIssuerKit('LaToken');

  const collateral70 = AmountMath.make(70n, testCollateralKit.brand);
  const proposal = harden({
    give: { Liquidity: collateral70 },
    want: { PoolToken: AmountMath.make(70n, brand) },
  });

  const payments = harden({
    Liquidity: collateralTypes[0].mint.mintPayment(collateral70),
  });
  const capitalAmount = AmountMath.make(testCollateralKit.brand, 1000n);
  assert(instance.creatorFacet);
  return {
    lendingPoolInvitation: await E(zoe).offer(
      E(instance.creatorFacet).makeDepositLiquidityInvitation(
        testCollateralKit.issuer,
        testCollateralKit.brand.getAllegedName(),
        {
          rates: collateralTypes.map(x => ({
            brand: x,
            stableBorrowRate: 10,
            lendRate: 5,
          })),
        },
      ),
      harden({
        give: { Liquidity: capitalAmount },
        want: { Governance: AmountMath.makeEmpty(brand) },
      }),
      harden({
        Liquidity: testCollateralKit.mint.mintPayment(capitalAmount),
      }),
    ),
    creatorFacet: await E(instance.creatorFacet),
    instance,
  };
}

const helperContract = launch(zoe, lendingPoolWrapper);

test('setup contractInstance::', async t => {
  const contractObject = await helperContract;

  trace('contractObject::', contractObject);
  t.deepEqual(contractObject, {}), '';
});
