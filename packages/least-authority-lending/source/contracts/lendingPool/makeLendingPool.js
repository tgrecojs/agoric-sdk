import { assertProposalShape } from '@agoric/zoe/src/contractSupport';

export const makeLendingPoolDepositInvitation = (zcf, config) => {
  const { lendingPoolSeat } = config;

  /** @type {OfferHandler} */
  const addCollateral = userSeat => {
    assertProposalShape(userSeat, {
      give: { Liquidity: null },
      want: { PoolToken: null },
    });

    lendingPoolSeat.incrementBy(
      userSeat.decrementBy({
        Liquidity: userSeat.getAmountAllocated('Liquidity'),
      }),
    );

    zcf.reallocate(lendingPoolSeat, userSeat);
    userSeat.exit();

    // Schedule the new liquidation trigger. The old one will have an
    // outdated quote and will be ignored
    return 'a warm fuzzy feeling that you are further away from default than ever before';
  };

  return zcf.makeInvitation(addCollateral, 'addCollateral');
};
