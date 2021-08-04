import { makeLendingPoolDepoitInvitation } from '.';

export const makeAddCollateral = (zcf, config) => {
  /** @type {OfferHandler} */
  const lend = lenderSeat => {
    // Lender will want the interest earned from the loan + their
    // refund or the results of the liquidation. If the price of
    // collateral drops before we get the chance to liquidate, the
    // total payout could be zero. Therefore, the lender cannot `want`
    // anything in their proposal.

    // If the exit rule was `waived`, a borrower would be able to hold
    // on to their invitation and effectively lock up the lender's
    // Loan forever. Thus, the lender must be able to exit on
    // demand until the borrowing occurs. When the borrowing occurs,
    // the collateral is moved to a special collateral seat to prevent
    // the lender from being able to exit with collateral before the
    // contract ends through repayment or liquidation.
    assertProposalShape(lenderSeat, {
      want: {}, // No return can be guaranteed.
      give: { Loan: null },
      exit: { onDemand: null }, // The lender must be able to exit with their loan at any time before the money is borrowed
    });

    const configWithLenderSeat = { ...config, lenderSeat };
    return makeLendingPoolDepoitInvitation(zcf, configWithLenderSeat);
  };
};
