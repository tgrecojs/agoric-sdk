// @ts-check

import '@agoric/zoe/exported';
import '@agoric/zoe/src/contracts/exported';

// The StableCoinMachine owns a number of VaultManagers, and a mint for the
// "RUN" stablecoin. This overarching SCM will hold ownershipTokens in the
// individual per-type vaultManagers.
//
// makeAddTypeInvitation is a closely held method that adds a brand new
// collateral type. It specifies the initial exchange rate for that type.
//
// a second closely held method (not implemented yet) would add collateral of a
// type for which there is an existing pool. It gets the current price from the
// pool.
//
// ownershipTokens for vaultManagers entitle holders to distributions, but you
// can't redeem them outright, that would drain the utility from the economy.

import { E } from '@agoric/eventual-send';
import { assert, details, q } from '@agoric/assert';
import makeStore from '@agoric/store';
import {
  assertProposalShape,
  offerTo,
  getAmountOut,
  getAmountIn,
} from '@agoric/zoe/src/contractSupport';

import {
  multiplyBy,
  makeRatioFromAmounts,
} from '@agoric/zoe/src/contractSupport/ratio';
import { AmountMath } from '@agoric/ertp';
import { makeTracer } from './makeTracer';
import { makeVaultManager } from './vaultManager';
import { makeLiquidationStrategy } from './liquidateMinimum';
import { makeMakeCollectFeesInvitation } from './collectRewardFees';

const trace = makeTracer('ST');

/** @type {ContractStartFn} */
export async function start(zcf) {
  // loanParams has time limits for charging interest
  const {

  } = await acf.getTerms()
  const [
    laLinkMint,
    laBLDMint,
    laUSDCMint,
    laRUNMint,
    govMint,
  ] = await Promise.all([
    zcf.makeZCFMint('laLINK', undefined, harden({ decimalPlaces: 6 })),
    zcf.makeZCFMint('laBLD', undefined, harden({ decimalPlaces: 6 })),
    zcf.makeZCFMint('laUSDC', undefined, harden({ decimalPlaces: 6 })),
    zcf.makeZCFMint('laRUN', undefined, harden({ decimalPlaces: 6 })),
    zcf.makeZCFMint('LARI', undefined, harden({ decimalPlaces: 6 })),
  ]);
  const { zcfSeat: vaultSeat, userSeat } = zcf.makeEmptySeatKit();

  trace('vaultSeat proposal', vaultSeat.getProposal());
  trace('vaultSeat::', vaultSeat);

  const { brand: runBrand } = lariTokenMint.getIssuerRecord();
  const runDebt = AmountMath.makeEmpty(runBrand);
  const interestCalculator = makeInterestCalculator(
    runBrand,
    manager.getInterestRate(),
    loanParams.chargingPeriod,
    loanParams.recordingPeriod,
  );

  const mintPoolTokens = async seat => {

  }
  const depositCollateral = userSeat => {
    const { want, give } = userSeat.getProposal();


    harden({
      give: { Liquidity: capitalAmount },
      want: { Governance: AmountMath.makeEmpty(govBrand) },
    }),
    harden({
      Liquidity: aethMint.mintPayment(capitalAmount),
    }),
    
  };

}


const { details: X } = assert;

// Adds an expiring lien to an amount in response to an incoming call.
// Can be queried for the current liened amount for an address.
const mintZCFMintPayment = (keyword = 'DefaultKeyword') => (zcf, zcfMint, amountToMint) => {
  const { userSeat, zcfSeat } = zcf.makeEmptySeatKit();
  zcfMint.mintGains({ Attestation: amountToMint }, zcfSeat);
  zcfSeat.exit();
  return E(userSeat).getPayout(keyword);
};

/**
 * @param {string} collateralType - the name for the attestation
 * token
 * @param {Amount} empty - an empty amount in the external brand (i.e.
 * BLD) that the attestation is about
 * @param {ContractFacet} zcf
 * @returns {Promise<{disallowExtensions: DisallowExtensions, addExpiringLien: AddExpiringLien, getLienAmount:
 * GetLienAmount, makeExtendAttInvitation:
 * MakeExtendAttInvitationInternal, getIssuer: () => Issuer, getBrand:
 * () => Brand}>}
 */
const setupLendingPool = async (collateralType, empty, zcf) => {
  assert(AmountMath.isEmpty(empty), X`empty ${empty} was not empty`);
  const zcfMint = await zcf.makeZCFMint(collateralType, AssetKind.SET);
  const {
    brand: attestationBrand,
    issuer: attestationIssuer,
  } = zcfMint.getIssuerRecord();

  const externalBrand = empty.brand;
 const makeDepositCollateralInvitation = (newExpiration, currentTime) => {
  // Fail-fast if the newExpiration is already out of date
  assert(
    !hasExpired(newExpiration, currentTime),
    X`The attestation could not be extended, as the new expiration ${newExpiration} is in the past`,
  );
  const offerHandler = seat => extendExpiration(seat, newExpiration);
  return zcf.makeInvitation(offerHandler, 'ExtendAtt', {
    brand: attestationBrand,
  });
};


}