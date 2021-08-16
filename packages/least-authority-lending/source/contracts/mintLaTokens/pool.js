/* global __dirname */
// @ts-check

import '@agoric/zoe/exported';
import '@agoric/zoe/src/contracts/exported';
import { assert, details as X } from '@agoric/assert';
import { Far } from '@agoric/marshal';
import { AmountMath, makeIssuerKit, AssetKind } from '@agoric/ertp';
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
import { collateralLists } from '../../shared/utils/interestRates';

const [usdcRates, runRates, bldRates, linkRates] = collateralLists;
const defaultPoolConfig = {
  brandName: 'Default',
  zcfSeats: {},
  keywords: harden({}),
  rates: {
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
    mint: await zcf.makeZCFMint('LaLink', AssetKind.SET),
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
        brandName,
        positionCount,
        zcfSeats: { zcfSeat, userSeat },
      } = poolConfig;

      const poolSeat = /** @type {ZCFSeat} */ (zcfSeat);
      const { brand: laTokenBrand } = mint.getIssuerRecord();
      const { brand: poolPositionBrand, mint: poolTokenMint } = makeIssuerKit(
        `${brandName}Tokens`,
      );
      const { want, give } = user.getProposal();
      depositAssertion(user);

      // const poolTokenAmount = createLaTokenRatio(
      //   give.Liquidity.brand,
      //   laTokenBrand,
      // )(give.Liquidity.value);
      const userAllocation = user.getCurrentAllocation();

      const positionToken = [
        {
          positionCount: positionCount ? positionCount + 1 : 1,
          payoutAmt: give.Liquidity,
          tokenId: positionCount ? positionCount + 1 : 1,
          underlyingToken: give.Liquidity.brand.getAllegedName(),
          tokensDeposited: give.Liquidity.value,
        },
      ];
      mint.mintGains(
        {
          PoolTokenNFT: AmountMath.make(laTokenBrand, positionToken),
        },
        user,
      );

      poolSeat.incrementBy(
        user.decrementBy({ Liquidity: userAllocation.Liquidity }),
      );

      trace('zcfSeat::hasStagedAllocation', poolSeat.hasStagedAllocation());
      trace('user::hasStagedAllocation', user.hasStagedAllocation());
      zcf.reallocate(poolSeat, user);
      user.exit();

      return 'Offer completed. You should receive a payment from Zoe';
    };
    return handleDeposit;
  };

  const updateUiState = () => {};
  // change to publicFacet
  const creatorFacet = Far('creatorFacet', {
    createDepositInvitation,
    depositToPool: (pool = laLinkPool) =>
      zcf.makeInvitation(createDepositInvitation(pool), 'handle mint'),
    initBldPool: () =>
      zcf.makeInvitation(
        createDepositInvitation(laBldPool),
        'mint LaBLD token',
      ),
    initRunPool: () =>
      zcf.makeInvitation(
        createDepositInvitation(LaRunPool),
        'mint LaRun tokens',
      ),
    createPosition: () =>
      zcf.makeInvitation(
        createDepositInvitation(laLinkPool),
        'create position from depsoit',
      ),
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
