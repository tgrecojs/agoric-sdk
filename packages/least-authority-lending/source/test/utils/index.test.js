// @ts-check
/* global require */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import '@agoric/zoe/exported';

import { AmountMath } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import {
  createTokenKits,
  createLendingTokenKits,
  collateralTypes,
  laTokenIssueKits,
} from '../../shared/utils/zoe';
import { makeTracer } from './tracer';

const prepend = string => target => `${string}${target}`;
const getBrandName = brand => brand.getAllegedName();
const getObjectLength = obj => Object.values(obj).length;
const testCollateralTypes = ['LINK', 'USDC', 'BLD', 'RUN'];

const testCollateralKits = createTokenKits(testCollateralTypes);
const [linkKit, USDCKit, BLDKit, RunKit] = Object.values(testCollateralKits);

test('zoe helper functions', async assert => {
  const testCollateralKits = createTokenKits(collateralTypes);
  assert.deepEqual(testCollateralKits.length === 4, true, '');

  assert.deepEqual(
    linkKit.brand.getAllegedName() === 'LINK',
    true,
    'should return an issuer kit for LINK',
  );
  assert.deepEqual(
    USDCKit.brand.getAllegedName() === 'USDC',
    true,
    'should return an issuer kit for USDC',
  );
  assert.deepEqual(
    BLDKit.brand.getAllegedName() === 'BLD',
    true,
    'should return an issuer kit for BLD',
  );
  assert.deepEqual(
    RunKit.brand.getAllegedName() === 'RUN',
    true,
    'should return an issuer kit for RUN',
  );
});
const makeLendingPoolDepost = userSeat => {};
const getValue = ({ value }) => value;
test('user Purses', async assert => {
  const testLinkPurse = linkKit.issuer.makeEmptyPurse();
  const testAmount = 1000n;
  const testDepositPayment = linkKit.mint.mintPayment(
    AmountMath.make(linkKit.brand, testAmount),
  );
  testLinkPurse.deposit(testDepositPayment);

  const purseValue = getValue(testLinkPurse.getCurrentAmount());
  assert.deepEqual(
    purseValue === testAmount,
    true,
    'getCurrentAmount() method provide the correct value',
  );
});

test('lending protocol issuer kits', async assert => {
  const laTokenTypes = testCollateralTypes.map(prepend('la'));
  const [laLINK, laUSDC, laBLD, laRUN] = laTokenTypes;
  assert.is(laLINK === 'laLINK', true, 'should create an issuerkit for laLINK');
  assert.is(laUSDC === 'laUSDC', true, 'should create an issuerkit for laUSDC');
  assert.is(laBLD === 'laBLD', true, 'should create an issuerkit for laBLD');
  assert.is(laRUN === 'laRUN', true, 'should create an issuerkit for laRUN');

  const lendingPoolKits = createLendingTokenKits(collateralTypes);

  assert.deepEqual(
    getObjectLength(lendingPoolKits) === 4,
    true,
    'should create 4 issuer kit',
  );

  assert.deepEqual(
    getObjectLength(lendingPoolKits) === 4,
    true,
    'should  4 issuer kit',
  );
});
