/* eslint-env node */
/** global fetch */

import {
  fetchEnvNetworkConfig,
  makeSmartWalletKit,
} from '@agoric/client-utils';
/**
 * @import { Command } from 'commander';
 * @import {ExecuteOfferAction, OfferSpec} from '@agoric/smart-wallet/src/smartWallet.js'
 */
import { outputActionAndHint } from '../lib/wallet.js';

export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * @param {Command} _program
 * @param {{
 *  createCommand: typeof import('commander').createCommand,
 *  fetch?: Window['fetch'];
 *  smartWalletKit?: import('@agoric/client-utils').SmartWalletKit;
 *  stdout: typeof process.stdout;
 *  stderr: typeof process.stderr;
 *  env: typeof process.env;
 *  now: typeof Date.now;
 * }} io
 */
export const addAirdropCommands = (
  _program,
  { createCommand, fetch, smartWalletKit, stderr, stdout, env, now },
) => {
  const airdropper = createCommand('airdropper').description(
    'Auctioneer commands',
  );

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

  airdropper
    .command('claim')
    .description(
      'constructs an OfferSpec in accordance with makeClaimTokensInvitation from ertp-airdrop.',
    )
    .option(
      '--instancePath <string>',
      'Name used when looking up the instance (e.g. agoricNames.instance[instancePath])',
      String,
      'tribblesDeployment',
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

      assert(
        powers.agoricNames.instance[instancePath],
        `${instancePath} is not in agoricNames`,
      );

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
          pubkey,
        },
      };

      /** @type {ExecuteOfferAction} */
      const bridgeAction = {
        method: 'executeOffer',
        offer,
      };

      outputActionAndHint(bridgeAction, { stderr, stdout });
    });

  return airdropper;
};
