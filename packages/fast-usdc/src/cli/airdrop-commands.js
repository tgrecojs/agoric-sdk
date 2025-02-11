/* eslint-env node */
/**
 * @import {Command} from 'commander';
 * @import {Amount, Brand} from '@agoric/ertp';
 * @import {OfferSpec} from '@agoric/smart-wallet/src/offers.js';
 * @import {ExecuteOfferAction} from '@agoric/smart-wallet/src/smartWallet.js';
 * @import {USDCProposalShapes} from '../pool-share-math.js';
 */

import {
  fetchEnvNetworkConfig,
  makeSmartWalletKit,
} from '@agoric/client-utils';
import { AmountMath } from '@agoric/ertp';
import {
  assertParsableNumber,
  ceilDivideBy,
  floorDivideBy,
  multiplyBy,
  parseRatio,
} from '@agoric/zoe/src/contractSupport/ratio.js';
import { InvalidArgumentError } from 'commander';
import { outputActionAndHint } from './bridge-action.js';
import { makeClaimAirdropOffer, Offers } from '../clientSupport.js';

export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/** @param {string} arg */
const parseDecimal = arg => {
  try {
    assertParsableNumber(arg);
    const n = Number(arg);
    return n;
  } catch {
    throw new InvalidArgumentError('Not a number');
  }
};

/**
 * @param {string} amountString
 * @param {Brand} usdc
 */
const parseUSDCAmount = (amountString, usdc) => {
  const USDC_DECIMALS = 6;
  const unit = AmountMath.make(usdc, 10n ** BigInt(USDC_DECIMALS));
  return multiplyBy(unit, parseRatio(amountString, usdc));
};

/**
 * @param {Command} program
 * @param {{
 *   fetch?: Window['fetch'];
 *    smartWalletKit?: import('@agoric/client-utils').SmartWalletKit;
 *   stdout: typeof process.stdout;
 *   stderr: typeof process.stderr;
 *   env: typeof process.env;
 *   now: typeof Date.now;
 * }} io
 */
export const addAirdropCommands = (
  program,
  { fetch, smartWalletKit, stderr, stdout, env, now },
) => {
  const loadSwk = async () => {
    if (smartWalletKit) {
      return smartWalletKit;
    }
    assert(fetch);
    const networkConfig = await fetchEnvNetworkConfig({ env, fetch });
    return makeSmartWalletKit({ delay, fetch }, networkConfig);
  };
  /** @type {undefined | ReturnType<typeof loadSwk>} */
  let swkP;

  program
    .command('claim')
    .description(
      'constructs an OfferSpec in accordance with makeClaimTokensInvitation from ertp-airdrop.',
    )
    .option(
      '--instancePath',
      'Name of the contract in agoricNames',
      'tribblesAirdropXnet3',
    )
    .option('--proof <string>', 'Proof', String)
    .option('--pubkey <string>', 'Public key', String)
    .option('--tier <number>', 'Tier', Number)
    .option('--offerId <string>', 'Offer id', String, `claim-${now()}`)
    .action(async opts => {
      const {
        instancePath,
        proof: proofString,
        tier,
        pubkey,
        offerId = `claim-${now()}`,
      } = opts;
      swkP ||= loadSwk();
      const powers = await swkP;

      const proof = JSON.parse(proofString);
      /** @type {Brand<'nat'>} */
      // @ts-expect-error it doesnt recognize usdc as a Brand type
      const ist = powers.agoricNames.brand.IST;
      assert(ist, 'IST brand not in agoricNames');

      /** @type {OfferSpec} */
      const offer = {
        id: offerId,
        invitationSpec: {
          source: 'agoricContract',
          instancePath: [instancePath],
          callPipe: [['makeClaimTokensInvitation']],
        },
        proposal: {
          give: {
            Fee: {
              brand: ist,
              value: 5n,
            },
          },
        },
        offerArgs: {
          proof,
          tier,
          key: pubkey,
        },
      };
      /** @type {ExecuteOfferAction} */
      const bridgeAction = {
        method: 'executeOffer',
        offer,
      };
      // const capData = powers.marshaller.toCapData(offer);

      outputActionAndHint(bridgeAction, { stderr, stdout }, powers.marshaller);
    });

  return program;
};
