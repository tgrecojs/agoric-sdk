/* global __dirname */
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
  want: { Price: null },
});

const trace = makeTracer('DEPOSIT');

const defaultKeywordMapping = {};

const makePool = () => {
  const zoe = makeZoe(fakeVatAdmin);

  return {
    installCode: async () => {
      // pack the contract
      const bundle = await bundleSource(lendingPoolInstance);
      // install the contract
      const installationP = E(zoe).install(bundle);
      return installationP;
    },
    startInstance: async (installation, keywordRecord = {}, terms = {}) => {
      const adminP = zoe.startInstance(installation, keywordRecord, terms);
      return adminP;
    },
  };
};

export const makeDepositToPool = (zcf, config) => {
  const { poolSeat } = config;

  /** @type {OfferHandler} */
  const addCollateral = depositSeat => {
    assertProposalShape(depositSeat, {
      give: { Liquidity: null },
      want: { PoolToken: null },
    });

    poolSeat.incrementBy(
      depositSeat.decrementBy({
        Liquidity: depositSeat.getAmountAllocated('Liquidity'),
      }),
    );

    zcf.reallocate(poolSeat, depositSeat);
    depositSeat.exit();

    // Schedule the new liquidation trigger. The old one will have an
    // outdated quote and will be ignored
    return 'a warm fuzzy feeling that you are further away from default than ever before';
  };

  return zcf.makeInvitation(addCollateral, 'addCollateral');
};

// const updateUtilization = ({})
test('makePool::', async t => {
  const { laLinkKit, linkKit, linkMint } = setup();

  const linkPayment = {
    Liquidity: linkMint.mintPayment(AmountMath.make(linkKit.brand, 1000n)),
  };
  const zoe = makeZoe(fakeVatAdmin);
  const x = await makePool();
  const install = await x.installCode();
  const createPoolKeywordMapping = ({ inKit, outKit }) => ({
    PoolToken: inKit.issuer,
    Liquidity: outKit.issuer,
  });
  const keys = createPoolKeywordMapping({ inKit: laLinkKit, outKit: linkKit });
  trace('KEYS', keys);
  const { creatorFacet, publicFacet } = await E(x).startInstance(install, keys);

  trace('creatorFacet##', creatorFacet);
  const invitationIssuer = await E(zoe).getInvitationIssuer();
  trace('invitationIssuer##', invitationIssuer);

  const paymentKeywordRecord = {
    Liquidity: linkPayment,
  };

  const depositInvite = E(creatorFacet).depositToPool();
  const userSeatP = await E(zoe).offer(
    await depositInvite,
    harden({
      want: { PoolToken: AmountMath.make(laLinkKit.brand, 1000n) },
      give: { Liquidity: AmountMath.make(linkKit.brand, 1000n) },
    }),
    paymentKeywordRecord,
  );

  const payoutResult = await E(userSeatP).getOfferResult();
  t.deepEqual(payoutResult, '', 'should be a string');
});

test('lending pool contract facet::', async t => {
  t.plan(4);
  const zoe = makeZoe(fakeVatAdmin);
  trace('ZOE INSIDE', zoe);

  const bundle = await bundleSource(lendingPoolInstance);
  // install the contract
  const installation = await zoe.install(bundle);
  const usdcKit = makeIssuerKit('USDC');
  const {
    link,
    linkKit,
    linkMint,
    linkIssuer,
    runIssuer,
    laLinkMint,
    laLinkIssuer,
    laLinkBrand,
    runKit,
    bldKit,
    laLink,
  } = setup();

  // Alice creates an instance
  const issuerKeywordRecord = harden({
    Liquidity: linkIssuer,
    PoolToken: laLinkIssuer,
  });

  const { creatorFacet, publicFacet } = await E(zoe).startInstance(
    installation,
    issuerKeywordRecord,
    { acceptedCollateral: [linkKit.brand, runKit.brand, usdcKit.brand] },
  );

  const linkDeposit = linkMint.mintPayment(
    AmountMath.make(linkKit.brand, 1000n),
  );
  const linkPayment = { Liquidity: linkDeposit };
  const lenderInvitation = await E(creatorFacet).initLinkPool(linkPayment);
  trace('LINK PAYMENT', linkPayment);
  // 4: Alice adds her sell order to the exchange
  const tokenAmount = 1000n;
  const userSeat = await E(zoe).offer(
    lenderInvitation,
    harden({
      give: { Liquidity: link(tokenAmount) },
      want: { PoolToken: laLink(tokenAmount) },
      exit: { onDemand: null },
    }),
    linkPayment,
  );

  const userProposal = await userSeat.getProposal();
  const { want, give } = userProposal;

  t.deepEqual(
    give.Liquidity.brand === linkKit.brand,
    true,
    'should give collateral for pool tokens',
  );
  t.deepEqual(
    give.Liquidity.value === 1000n,
    true,
    'userSeat.getProposal() should return an object with the correct value',
  );

  t.deepEqual(
    want.PoolToken.brand === laLinkBrand,
    true,
    'userSeat.getProposal() should return an object with the correct PoolToken brand ',
  );
  t.deepEqual(
    want.PoolToken.value === 1000n,
    true,
    'userSeat.getProposal() should return an object with the correct PoolToken value ',
  );
});
