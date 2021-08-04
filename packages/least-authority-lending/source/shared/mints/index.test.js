// @ts-check
/* global require */

import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import '@agoric/zoe/exported';
import { E } from '@agoric/eventual-send';

import bundleSource from '@agoric/bundle-source';
import fakeVatAdmin from '@agoric/zoe/tools/fakeVatAdmin';
import { makeZoe } from '@agoric/zoe';
import { AmountMath } from '@agoric/ertp';
import {
  createLendingTokenKits,
  createTokenKit,
  collateralTypes,
} from './index';

const zoe = makeZoe(fakeVatAdmin);

const lariTokenIssuerKits = createLendingTokenKits();
const collateralIssuerKits = createTokenKit(collateralTypes);
const [linkPool, UsdcPool, BLDPool, RunPool] = lariTokenIssuerKits;

test('createIssuerKits()', async t => {
  t.plan(5);

  t.deepEqual(
    lariTokenIssuerKits.length === 4,
    true,
    'should return an array with 4 Issuer Kits',
  );
  t.deepEqual(
    linkPool.brand.getAllegedName(),
    'laLINK',
    'linkPool brand name should be lariLINK',
  );
  t.deepEqual(
    UsdcPool.brand.getAllegedName(),
    'laUSDC',
    'linkPool brand name should be lariUSDC',
  );
  t.deepEqual(
    BLDPool.brand.getAllegedName(),
    'laBLD',
    'BLDPool brand name should be lariBLD',
  );
  t.deepEqual(
    RunPool.brand.getAllegedName(),
    'laRUN',
    'RUNPool brand name should be lariRUN',
  );
});

const makePayment = brand => value => AmountMath.make(brand, value);

const makeProposal = (userFunds, poolTokens) => ({
  give: { Deposit: userFunds.toUpperCase() },
  want: { LendingPoolToken: poolTokens.toUpperCase() },
});

test('createTokenKit()', async t => {
  t.plan(4);
  const [
    { brand: linkBrand, issuer: linkIssuer },
    { brand: usdcBrand },
    { brand: bldBrand, issuer: bldIssuer },
    { brand: runBrand, issuer: runIssuer },
  ] = collateralIssuerKits;

  t.deepEqual(
    linkBrand.getAllegedName() === 'LINK',
    true,
    'should return an issuerKit for LINK brand',
  );
  t.deepEqual(
    usdcBrand.getAllegedName() === 'USDC',
    true,
    'should return an issuerKit for USDC brand',
  );
  t.deepEqual(
    bldBrand.getAllegedName() === 'BLD',
    true,
    'should return an issuerKit for BLD brand',
  );
  t.deepEqual(
    runBrand.getAllegedName() === 'RUN',
    true,
    'should return an issuerKit for RUN brand',
  );
});
