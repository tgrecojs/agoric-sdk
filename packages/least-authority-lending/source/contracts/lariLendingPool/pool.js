/* global __dirname */
// @ts-check

import '@agoric/zoe/exported';
import '@agoric/zoe/src/contracts/exported';
import { assert, details as X } from '@agoric/assert';
import { Far } from '@agoric/marshal';
import { AmountMath } from '@agoric/ertp';
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

import { makeTracer } from '../../test/utils/tracer';

const laTokenPairs = [{ link: 'laLINK' }, { bld: 'laBLD' }, { usdc: 'laUSDC' }];
const getRequestedLaToken = collateralType => laTokenPairs[collateralType];
const trace = makeTracer('DEPOSIT TO LENDING POOL');

const start = async zcf => {
  assertIssuerKeywords(zcf, harden(['Liquidity', 'PoolToken']));

  /** @type {OfferHandler} */
  const makeMatchingInvitation = firstSeat => {
    assertProposalShape(firstSeat, {
      give: { Asset: null },
      want: { Price: null },
    });
    const { want, give } = firstSeat.getProposal();

    /** @type {OfferHandler} */
    const matchingSeatOfferHandler = matchingSeat => {
      const swapResult = swap(zcf, firstSeat, matchingSeat);
      zcf.shutdown('Swap completed.');
      return swapResult;
    };

    const matchingSeatInvitation = zcf.makeInvitation(
      matchingSeatOfferHandler,
      'matchOffer',
      {
        asset: give.Asset,
        price: want.Price,
      },
    );
    return matchingSeatInvitation;
  };

  const depositToPoolInvitation = zcf.makeInvitation(
    makeMatchingInvitation,
    'firstOffer',
  );

  // Create the internal token mint for a fungible digital asset. Note
  // that 'Tokens' is both the keyword and the allegedName.

  const { acceptedCollateral } = zcf.getTerms();
  trace('ACCEPTED Liquidity::', acceptedCollateral);

  const [linkBrand, bldBrand, lariLinkBrand, laBLDBrand] = acceptedCollateral;
  trace('collateralBrands', acceptedCollateral);
  const [
    laLinkMint,
    laUSDCMint,
    laBLDMint,
    laRUNMint,
    LARIMint,
  ] = await Promise.all([
    zcf.makeZCFMint('LaLINK', undefined, harden({ decimalPlaces: 6 })),
    zcf.makeZCFMint('LaUSDC', undefined, harden({ decimalPlaces: 6 })),
    zcf.makeZCFMint('LaBLD', undefined, harden({ decimalPlaces: 6 })),
    zcf.makeZCFMint('LaRUN', undefined, harden({ decimalPlaces: 6 })),
    zcf.makeZCFMint('LARI', undefined, harden({ decimalPlaces: 6 })),
  ]);

  trace('laLinkMint', laLinkMint);

  const { zcfSeat: lendingPoolSeat, depositSeat } = zcf.makeEmptySeatKit();
  trace('zcfSeat: LENDING POOL SEAT ', lendingPoolSeat);

  const createLaTokenRatio = (collateralBrand, lariTokenBrand) => amount =>
    makeRatio(amount, collateralBrand, amount, lariTokenBrand);
  const defaultPoolConfig = {
    mint: await zcf.makeZCFMint('LaLink'),
    zcfSeats: zcf.makeEmptySeatKit(),
    keywords: harden({
      give: { PoolToken: null },
      want: { Liquidity: null },
    }),
  };

  const createLendingPoolInvitation = (config = defaultPoolConfig) => {
    const { mint, zcfSeats, keywords, ...rest } = config;
    const { zcfSeat: poolSeat, userSeat } = zcfSeats;
    const {
      brand: poolTokenBrand,
      issuer: poolTokenIssuer,
    } = mint.getIssuerRecord();
    trace('POOL CONFIG', config);
    const mintPoolTokens = async seat => {
      // get the payout to provide access to the collateral if the
      // contract abandons

      trace('poolSeat:::', poolSeat);

      const { want, give: userDeposit } = seat.getProposal();

      mint.mintGains(
        {
          PoolToken: AmountMath.make(10000n, poolTokenBrand),
        },
        poolSeat,
      );
      trace('poolSeat:::', poolSeat.getCurrentAllocation());
      trace('userSear:::', seat.getCurrentAllocation());

      trace('poolSeatWithdrawal::', poolSeat);

      // await depositToSeat(
      //   zcf,
      //   userSeat,
      //   { PoolToken: userPayout },
      //   { PoolToken: poolSeatWithdrawal },
      // );

      trace('userSeat::getCurrentAllocatio:::', seat.getCurrentAllocation());

      poolSeat.decrementBy(
        userSeat.decrementBy({ Liquidity:  })
      )
      trace(
        'lendingPoolSeat:::getCurrentAllocation',
        poolSeat.getCurrentAllocation(),
      );
      swap(zcf, poolSeat, userSeat);
      trace(
        'AFTER SWA{ poolSeat:::getCurrentAllocation',
        poolSeat.getCurrentAllocation(),
      );
      return 'swap success!';
    };
    return zcf.makeInvitation(mintPoolTokens, 'MintPoolTokensForCollateral');
  };
  const publicFacet = harden({
    linkPoolInvitation: createLendingPoolInvitation,
    // TODO this is in the terms, so could be retrieved from there.
  });
  const creatorFacet = harden({
    getLaLinkIssuer: () => laLinkMint.getIssuerRecord(),
    depositToPoolInvitation,
    createLendingPoolInvitation,
  });

  return harden({
    creatorFacet,
    creatoInvitation: createLendingPoolInvitation,
    publicFacet,
  });
};

export { start };
