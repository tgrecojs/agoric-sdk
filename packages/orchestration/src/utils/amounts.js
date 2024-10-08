import { makeError } from '@endo/errors';

/**
 * @import {ChainHub} from "../types.js";
 * @import {AmountArg, Denom, DenomAmount, DenomArg} from "../orchestration-api.js";
 * @import {Coin} from '@agoric/cosmic-proto/cosmos/base/v1beta1/coin.js';
 */

/**
 * @param {ChainHub} chainHub
 * @param {DenomArg} denomArg
 * @returns {Denom}
 */
export const coerceDenom = (chainHub, denomArg) => {
  if (typeof denomArg === 'string') {
    return denomArg;
  }
  const denom = chainHub.lookupDenom(denomArg);
  if (!denom) {
    throw makeError(`No denomination for brand ${denomArg}`);
  }
  return denom;
};

/**
 * @param {ChainHub} chainHub
 * @param {DenomAmount | Amount<'nat'>} amount
 * @returns {DenomAmount}
 */
export const coerceDenomAmount = (chainHub, amount) => {
  if ('denom' in amount) {
    return amount;
  }
  const denom = coerceDenom(chainHub, amount.brand);
  return harden({
    denom,
    value: amount.value,
  });
};

/**
 * @param {ChainHub} chainHub
 * @param {AmountArg | Amount<'nat'>} amount
 * @returns {Coin}
 */
export const coerceCoin = (chainHub, amount) => {
  const denom =
    'denom' in amount ? amount.denom : coerceDenom(chainHub, amount.brand);
  return harden({
    denom,
    amount: String(amount.value),
  });
};
