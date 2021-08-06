/* global __dirname */
// @ts-check

import '@agoric/zoe/exported';
import '@agoric/zoe/src/contracts/exported';
import { assert, details as X } from '@agoric/assert';
import { Far } from '@agoric/marshal';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { E } from '@agoric/eventual-send';
import {
  assertProposalShape,
  offerTo,
  assertIssuerKeywords,
  depositToSeat,
  withdrawFromSeat,
  makeRatio,
  multiplyBy,
  swap,
} from '@agoric/zoe/src/contractSupport/index.js';
import { depositAssertion } from '../../shared/utils/helpers';
import { makeTracer } from '../../shared/utils/tracer';

const defaultPoolConfig = {
  brandName: 'Default',
  zcfSeats: {},
  keywords: harden({
    give: { PoolToken: null },
    want: { Liquidity: null },
  }),
  rates: {
    stableBorrow: 8,
    variableBorrow: 15,
    lendRate: 3,
  },
};

const trace = makeTracer('DEPOSIT TO LENDING POOL');

const start = async zcf => {
  const createPoolConfig = (obj = {}) => ({
    ...defaultPoolConfig,
    ...obj,
  });

  const laLinkPool = createPoolConfig({
    mint: await zcf.makeZCFMint('LaLink'),
    brandName: 'LaLink',
    zcfSeats: zcf.makeEmptySeatKit(),
  });
  const createLaTokenRatio = (collateralBrand, lariTokenBrand) => amount =>
    makeRatio(amount, collateralBrand, amount, lariTokenBrand);

  const createDepositInvitation = (poolConfig = laLinkPool) => {
    trace('poolConfig::', poolConfig);

    const handleDeposit = user => {
      const {
        mint,
        zcfSeats: { zcfSeat, userSeat },
      } = poolConfig;

      const { brand: laTokenBrand } = mint.getIssuerRecord();
      const { want, give } = user.getProposal();
      depositAssertion(user);

      // const poolTokenAmount = createLaTokenRatio(
      //   give.Liquidity.brand,
      //   laTokenBrand,
      // )(give.Liquidity.value);
      const userAllocation = user.getCurrentAllocation();

      const { zcfSeat: _laTokenSeat } = zcf.makeEmptySeatKit();
      const payoutAmt = AmountMath.make(
        laTokenBrand,
        userAllocation.Liquidity.value,
      );

      // Synchronously mint and allocate amount to seat.
      mint.mintGains(
        {
          PoolToken: payoutAmt,
        },
        _laTokenSeat,
      );

      zcfSeat.incrementBy(
        user.decrementBy({ Liquidity: userAllocation.Liquidity }),
      );
      trace('zcfSeat::hasStagedAllocation', zcfSeat.hasStagedAllocation());

      // This doesn't seem to
      user.incrementBy(_laTokenSeat.decrementBy({ PoolToken: want.PoolToken }));

      trace('user::hasStagedAllocation', user.hasStagedAllocation());

      zcf.reallocate(zcfSeat, user);

      user.exit();

      return 'Offer completed. You should receive a payment from Zoe';
    };
    return handleDeposit;
  };

  const creatorFacet = harden({
    createDepositInvitation,
    depositToPool: (pool = laLinkPool) =>
      zcf.makeInvitation(createDepositInvitation(pool), 'handle mint'),
    initLinkPool: () =>
      zcf.makeInvitation(
        createDepositInvitation(laLinkPool),
        'mint pool tokens',
      ),
  });

  return harden({
    creatorFacet,
  });
};

export { start };
