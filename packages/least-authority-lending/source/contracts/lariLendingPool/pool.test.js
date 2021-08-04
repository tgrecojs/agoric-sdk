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
import { makeTracer } from '../../test/utils/tracer';

const lendingPoolKeywordRecod = harden({
  give: { Liquidity: null },
  want: { Price: null },
});

const trace = makeTracer('POOL CONTRACT SETUP');
const contractRoot = `${__dirname}/../../test/utils/setupZCF.js`;
const lendingPoolInstance = `${__dirname}/pool.js`;

async function setupContract(collateralIssuer, poolTokenIssuer) {
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

  let testJig;
  const setJig = jig => {
    testJig = jig;
  };
  const zoe = makeZoe(makeFakeVatAdmin(setJig).admin);

  // pack the contract
  const bundle = await bundleSource(contractRoot);
  // install the contract
  const installation = await zoe.install(bundle);

  // Alice creates an instance
  const issuerKeywordRecord = harden({
    Liquidity: collateralIssuer,
    PoolToken: poolTokenIssuer,
  });

  await E(zoe).startInstance(installation, issuerKeywordRecord);
  /** @type {ContractFacet} */
  const zcf = testJig.zcf;
  return { zoe, zcf };
}

test('lending pool contract facet::', async t => {
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

  const lenderInvitation = await E(publicFacet).linkPoolInvitation();
  const linkDeposit = linkMint.mintPayment(
    AmountMath.make(linkKit.brand, 1000n),
  );
  const linkPayment = { Liquidity: linkDeposit };
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
