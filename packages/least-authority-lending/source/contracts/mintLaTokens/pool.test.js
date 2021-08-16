// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { E } from '@agoric/eventual-send';
import bundleSource from '@agoric/bundle-source';
import { makeOffer } from '@agoric/zoe/src/zoeService/offer/offer';
import {
  depositToSeat,
  offerTo,
  swap,
  assertProposalShape,
  assertIssuerKeywords,
} from '@agoric/zoe/src/contractSupport';
import fakeVatAdmin, { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin';
import { makeZoe } from '@agoric/zoe';
import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { Far } from '@agoric/marshal';
import { setup } from '../../test/utils/setupAssets';
import { makeTracer } from '../../shared/utils/tracer';

const lendingPoolInstance = `${__dirname}/pool.js`;
const lendingPoolKeywordRecod = harden({
  give: { Liquidity: null },
  want: { PoolToken: null },
});

const trace = makeTracer('DEPOSIT');

const defaultKeywordMapping = {};

test('lending pool contract facet::', async t => {
  const zoe = makeZoe(fakeVatAdmin);
  trace('ZOE INSIDE', zoe);

  const bundle = await bundleSource(lendingPoolInstance);
  // install the contract
  const installation = await E(zoe).install(bundle);
  const usdcKit = makeIssuerKit('USDC');
  const {
    link,
    linkKit,
    linkMint,
    linkIssuer,
    runIssuer,
    runKit,
    bldKit,
  } = setup();

  // Alice creates an instance
  const issuerKeywordRecord = harden({
    Liquidity: linkIssuer,
  });

  const contractObject = await E(zoe).startInstance(
    installation,
    issuerKeywordRecord,
    {
      acceptedCollateral: [linkKit.brand, runKit.brand, usdcKit.brand],
    },
  );
  trace('contractObject::', { contractObject });
  // provides contract keys and issuers
  // different than getIssuerRecord
  const { instance, creatorFacet } = contractObject;
  const { LaLink: laLinkIssuer } = await E(zoe).getIssuers(instance);
  const { LaLink: laLinkBrand } = await E(zoe).getBrands(instance);

  const testDepositVal = AmountMath.make(linkKit.brand, 1000n);
  const linkDeposit = linkMint.mintPayment(testDepositVal);
  const linkPayment = { Liquidity: linkDeposit };
  const lenderInvitation = await E(creatorFacet).initLinkPool();
  trace('LINK PAYMENT', linkPayment);
  const tokenAmount = 1000n;

  const setPayment = AmountMath.make(laLinkBrand, [
    {
      positionCount: 1,
      tokenId: 1,
      underlyingToken: linkKit.brand.getAllegedName(),
      tokensDeposited: tokenAmount,
    },
  ]);
  const userSeat = await E(zoe).offer(
    lenderInvitation,
    harden({
      give: { Liquidity: testDepositVal },
      want: {
        PoolTokenNFT: setPayment,
      },
      exit: { onDemand: null },
    }),
    linkPayment,
  );
  const payouts = await E(userSeat).getPayouts();
  const res = await E(userSeat).getPayout('PoolTokenNFT');
  const liq = await E(userSeat).getPayout('Liquidity');
  trace('PAYOUTS:::', payouts);

  trace('RESS:::', res);
  const depositPayout = await E(laLinkIssuer).getAmountOf(res);

  // t.deepEqual(liquidityAtEnd, 0, 'sshould be 0');
  trace('LINK depositPayout', depositPayout);
  t.deepEqual(
    depositPayout.value,
    [
      {
        positionCount: 1,
        payoutAmt: AmountMath.make(linkKit.brand, 1000n),

        tokenId: 1,
        underlyingToken: linkKit.brand.getAllegedName(),
        tokensDeposited: tokenAmount,
      },
    ],
    'liquidityAmount should return the correct payment',
  );
  t.is(liq.getAllegedBrand().getAllegedName(), linkKit.brand.getAllegedName());
  const endLiqudityValue = await E(linkKit.issuer).getAmountOf(liq);
});

// test('lending pool contract facet:: initBldPool', async t => {
//   t.plan(3);
//   const zoe = makeZoe(fakeVatAdmin);
//   trace('ZOE INSIDE', zoe);

//   const bundle = await bundleSource(lendingPoolInstance);
//   // install the contract
//   const installation = await E(zoe).install(bundle);
//   const usdcKit = makeIssuerKit('USDC');
//   const { bld, runKit, bldKit } = setup();

//   // Alice creates an instance
//   const issuerKeywordRecord = harden({
//     Liquidity: bldKit.issuer,
//   });

//   const { creatorFacet, publicFacet, instance } = await E(zoe).startInstance(
//     installation,
//     issuerKeywordRecord,
//     {
//       acceptedCollateral: [bldKit.brand, runKit.brand, usdcKit.brand],
//     },
//   );

//   // provides contract keys and issuers
//   // different than getIssuerRecord
//   const { LaBLD: laBldIssuer } = await E(zoe).getIssuers(instance);
//   const { LaBLD: laBldBrand } = await E(zoe).getBrands(instance);

//   const bldDeposit = bldKit.mint.mintPayment(
//     AmountMath.make(bldKit.brand, 1000n),
//   );
//   const bldPayment = { Liquidity: bldDeposit };
//   const lenderInvitation = await E(creatorFacet).initBldPool();
//   trace('BLD PAYMENT', bldPayment);
//   const {
//     issuer: bldPoolTokenIssuer,
//     mint: bldPoolTokenMint,
//     brand: bldPoolbrand,
//   } = makeIssuerKit('LaBLDTokens', AssetKind.NAT);
//   const tokenAmount = 1000n;
//   const testPositionPayout = AmountMath.make(laBldBrand, [
//     {
//       positionCount: 0,
//       payoutAmt: bldPoolTokenMint.mintPayment(
//         AmountMath.make(bldPoolbrand, 1000n),
//       ),
//       tokenId: 1,
//       underlyingToken: bldKit.brand.getAllegedName(),
//       tokensDeposited: tokenAmount,
//     },
//   ]);

//   trace('testPositionPayout::::', testPositionPayout);

//   const userSeat = await E(zoe).offer(
//     lenderInvitation,
//     harden({
//       give: { Liquidity: AmountMath.make(bldKit.brand, tokenAmount) },
//       want: { PoolToken: testPositionPayout },
//       exit: { onDemand: null },
//     }),
//     bldPayment,
//   );
//   trace('userSeat::::', await userSeat.getCurrentAllocation());

//   const offerResult = await E(userSeat).getPayouts();
//   t.is(
//     await E(offerResult.PoolToken),
//     'Offer completed. You should receive a payment from Zoe',
//   );

//   const liquidityAmount = await E(bldKit.issuer).getAmountOf(
//     offerResult.PoolToken,
//   );
//   t.deepEqual(
//     liquidityAmount,
//     AmountMath.make(bldKit.brand, 0),
//     'liquidityAmount should return the correct payment',
//   );
//   // returns { Liquduity: value: 0, PoolToken:{ value: x} }
//   const payoutAmt = await E(laBldIssuer).getAmountOf(depositPayout);
//   t.deepEqual(
//     payoutAmt,
//     testPositionPayout,
//     'payoutAmount should return the correct payment',
//   );
// });
