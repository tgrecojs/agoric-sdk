// @ts-check
/* global require */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import '@agoric/zoe/exported';
import { E } from '@agoric/eventual-send';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin';
import { makeLoopback } from '@agoric/captp';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { assert } from '@agoric/assert';
import { makeZoe } from '@agoric/zoe';
import { assertProposalShape } from '@agoric/zoe/src/contractSupport/index.js';

import { Far } from '@agoric/marshal';
import bundleSource from '@agoric/bundle-source';
import { makeTracer } from '../../src/treasury-code/makeTracer';

const trace = makeTracer('TestVault');

/**
 * The properties will be asssigned by `setTestJig` in the contract.
 *
 * @typedef {Object} TestContext
 * @property {ContractFacet} zcf
 * @property {ZCFMint} runMint
 * @property {IssuerKit} collateralKit
 * @property {Vault} vault
 * @property {TimerService} timer
 */

/* @type {TestContext} */
let testJig;
const setJig = jig => {
  testJig = jig;
};

const { makeFar, makeNear: makeRemote } = makeLoopback('zoeTest');

/** @type {ERef<ZoeService>} */
const zoe = makeFar(makeZoe(makeFakeVatAdmin(setJig, makeRemote).admin));
trace('makeZoe');
test('lariLendingProposal', async t => {
  const { issuer: moolaIssuer, brand: moolaBrand } = makeIssuerKit('moola');
  const { issuer: lariMoolaIssuer, brand: lariMoolaBrand } = makeIssuerKit(
    'lariMoola',
  );
  const atomicSwapBundle = await bundleSource(
    require.resolve('@agoric/zoe/src/contracts/atomicSwap'),
  );

  const moolaPurse = moolaIssuer.makeEmptyPurse();
  moolaPurse.deposit(AmountMath.make(moolaBrand, 1000));

  const issuerKeywordRecord = harden({
    In: moolaIssuer,
    Out: lariMoolaIssuer,
  });
  const threeMoola = AmountMath.make(moolaBrand, 3);
  const threeLariMoola = AmountMath.make(lariMoolaBrand, 3);

  const atomicSwapInstallation = await E(zoe).install(atomicSwapBundle);
  const proposal = {
    give: { In: threeMoola },
    want: { Out: threeLariMoola },
  };

  const aliceMoola = await E(moolaPurse).withdraw(threeMoola);

  const userPayment = { Asset: aliceMoola };
  const { creatorInvitation } = await E(zoe).startInstance(
    atomicSwapInstallation,
    issuerKeywordRecord,
  );
  const userSeat = await E(zoe).offer(creatorInvitation, proposal, userPayment);
  const invitationP = userSeat.getOfferResult();
  const { installation: bobInstallationId, instance } = E(
    zoe,
  ).getInvitationDetails(invitationP);
  const bobIssuers = E(zoe).getIssuers(instance);

  const bobExclusiveInvitation = await creatorInvitation.claim(invitationP);
  const bobInvitationValue = await E(zoe).getInvitationDetails(
    bobExclusiveInvitation,
  );
});
test('leastAuthorityLendingPoolDeposit', async t => {
  const {
    issuer: linkIssuer,
    mint: LINKMint,
    brand: LINKBrand,
  } = makeIssuerKit('LINK');
  const {
    issuer: laLINKIssuer,
    mint: laLINKMint,
    brand: lariLINKBrand,
  } = makeIssuerKit('lariLendingLINK');

  const atomicSwapInstallation = await E(zoe).install(atomicSwapBundle);
  const lariIssuerKeywordRecord = harden({
    Asset: linkIssuer,
    Price: laLINKIssuer,
  });
  const { creatorInvitation } = await E(zoe).startInstance(
    atomicSwapInstallation,
    lariIssuerKeywordRecord,
  );
  t.deepEqual(creatorInvitation, 'creator');
});

test('helper functions', async t => {
  // loanParams has time limits for charging interest
  /**
   * @type {ContractStartFn}
   */
  const start = async zcf => {
    const [lariLINKMint, LINKMint] = await Promise.all([
      zcf.makeZCFMint('lariLINK', undefined, harden({ decimalPlaces: 6 })),
      zcf.makeZCFMint('LINK', undefined, harden({ decimalPlaces: 6 })),
    ]);
    const {
      issuer: lariLINKIssuer,
      brand: lariLINKBrand,
    } = lariLINKMint.getIssuerRecord();

    const { brand: linkBrand } = LINKMint.getIssuerRecord();

    // This is a stand-in for a reward pool. For now, it's a place to squirrel
    // away fees so the tests show that the funds have been removed.
    const issuerKeywordRecord = harden({
      Asset: linkBrand,
      Price: lariLINKBrand,
    });
    const atomicSwapBundle = await bundleSource(
      require.resolve('@agoric/zoe/src/contracts/atomicSwap'),
    );
    const atomicSwapInstallation = await E(zoe).install(atomicSwapBundle);
    const { zcfSeat: userSeat } = zcf.makeEmptySeatKit();
    const {
      publicFacet: lariLINKFacet,
      instance: lariLINKSwap,
      creatorFacet: lariLINKCreatorFacet,
    } = await E(zoe).startInstance(atomicSwapInstallation, issuerKeywordRecord);
    return harden({
      creatorFacet: lariLINKFacet,
      lariLINKSwap,
      lariLINKCreatorFacet,
    });
  };
  const zoeInstance = await E(zoe).startInstance(start);
  console.log({ zoe });
  t.deepEqual(zoeInstance, zoe);
});
