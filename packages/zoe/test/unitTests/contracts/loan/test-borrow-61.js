// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import { assert, details } from '@agoric/assert';
import { makeIssuerKit } from '@agoric/ertp';

import { natSafeMath } from '../../../../src/contractSupport';
import { makePercent } from '../../../../src/contractSupport/percentMath';

const oldVersion = (loanMath, loanWanted, mmr, collateralPriceInLoanBrand) => {
  // formula: assert collateralValue*100 >= loanWanted*mmr

  // Calculate approximate value just for the error message if needed
  const approxForMsg = loanMath.make(
    natSafeMath.floorDivide(natSafeMath.multiply(loanWanted.value, mmr), 100),
  );

  // Assert the required collateral was escrowed.
  assert(
    loanMath.isGTE(
      loanMath.make(
        natSafeMath.multiply(collateralPriceInLoanBrand.value, 100),
      ),
      loanMath.make(natSafeMath.multiply(loanWanted.value, mmr)),
    ),
    details`The required margin is approximately ${approxForMsg} but collateral only had value of ${collateralPriceInLoanBrand}`,
  );
};

const newVersion = (loanMath, loanWanted, mmr, collateralPriceInLoanBrand) => {
  // formula: assert collateralValue*100 >= loanWanted*mmr

  // Calculate approximate value just for the error message if needed
  const approxForMsg = mmr.scale(loanWanted);

  // Assert the required collateral was escrowed.
  assert(
    loanMath.isGTE(
      loanMath.make(
        natSafeMath.multiply(collateralPriceInLoanBrand.value, 100),
      ),
      mmr.scale(loanWanted),
    ),
    details`The required margin is approximately ${approxForMsg.value}% but collateral only had value of ${collateralPriceInLoanBrand.value}`,
  );
};

test('calculation of isGTE', async t => {
  const moolaKit = makeIssuerKit('moola');

  t.throws(
    () =>
      oldVersion(
        moolaKit.amountMath,
        moolaKit.amountMath.make(1000),
        150,
        moolaKit.amountMath.make(1000),
      ),
    {
      message:
        'The required margin is approximately (an object) but collateral only had value of (an object)',
    },
  );

  t.throws(
    () =>
      newVersion(
        moolaKit.amountMath,
        moolaKit.amountMath.make(1000),
        makePercent(150, moolaKit.amountMath),
        moolaKit.amountMath.make(1000),
      ),
    {
      message:
        'The required margin is approximately (an object) but collateral only had value of (an object)',
    },
  );
});
