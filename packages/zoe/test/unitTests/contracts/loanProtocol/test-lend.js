// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import '../../../../exported';

import { E } from '@agoric/eventual-send';
import { AmountMath } from '@agoric/ertp';

import { setupAgTokenMint, checkDescription } from './helpers';

import { makeLendInvitation } from '../../../../src/contracts/loan/lend';
import { makeRatio } from '../../../../src/contractSupport';

test('makeLendInvitation', async t => {
  const { zcf, zoe, linkLoanKit } = await setupAgTokenMint();

  const config = {
    mmr: makeRatio(150n, linkLoanKit.brand),
  };
  const lendInvitation = makeLendInvitation(zcf, config);

  await checkDescription(t, zoe, lendInvitation, 'lend');

  const maxLoan = AmountMath.make(1000n, linkLoanKit.brand);

  const proposal = harden({
    give: { Loan: maxLoan },
  });

  const payments = harden({
    Loan: linkLoanKit.mint.mintPayment(maxLoan),
  });

  const lenderSeat = await E(zoe).offer(lendInvitation, proposal, payments);

  const borrowInvitation = await E(lenderSeat).getOfferResult();
  await checkDescription(t, zoe, borrowInvitation, 'borrow');
});
