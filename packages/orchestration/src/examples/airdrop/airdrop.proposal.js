// @ts-check
import { E } from '@endo/far';
import { makeMarshal } from '@endo/marshal';
import { Fail } from '@endo/errors';
import { makeTracer, deeplyFulfilledObject } from '@agoric/internal';
import { makeStorageNodeChild } from '@agoric/internal/src/lib-chainStorage.js';
import './types.js';

const ONE_DAY = 86_000n;

const AIRDROP_TIERS_STATIC = [9000n, 6500n, 3500n, 1500n, 750n];

// vstorage paths under published.*
const BOARD_AUX = 'boardAux';

const marshalData = makeMarshal(_val => Fail`data only`);

const IST_UNIT = 1_000_000n;

/**
 * @import {ERef} from '@endo/far';
 * @import {StorageNode} from '@agoric/internal/src/lib-chainStorage.js';
 * @import {BootstrapManifest} from '@agoric/vats/src/core/lib-boot.js';
 */

/**
 * Make a storage node for auxilliary data for a value on the board.
 *
 * @param {ERef<StorageNode>} chainStorage
 * @param {string} boardId
 */
const makeBoardAuxNode = async (chainStorage, boardId) => {
  const boardAux = E(chainStorage).makeChildNode(BOARD_AUX);
  return E(boardAux).makeChildNode(boardId);
};

const publishBrandInfo = async (chainStorage, board, brand) => {
  const [id, displayInfo] = await Promise.all([
    E(board).getId(brand),
    E(brand).getDisplayInfo(),
  ]);
  const node = makeBoardAuxNode(chainStorage, id);
  const aux = marshalData.toCapData(harden({ displayInfo }));
  await E(node).setValue(JSON.stringify(aux));
};

const trace = makeTracer('tribbles airdrop');
/** @import {StartArgs} from './platform-goals/start-contract.js'; */

export const defaultCustomTerms = {
  startTime: 120n,
  initialPayoutValues: harden(AIRDROP_TIERS_STATIC),
  targetNumberOfEpochs: 5,
  targetEpochLength: 36_000n / 2n,
  targetTokenSupply: 10_000_000n,
  tokenName: 'Tribbles',
};

export const makeTerms = (terms = {}) => ({
  ...defaultCustomTerms,
  ...terms,
});

harden(makeTerms);

const contractName = 'tribblesAirdrop';

/**
 * Core eval script to start contract
 *
 * @param {BootstrapPowers} permittedPowers
 * @param powers
 * @param {any} config
 *
 * @typedef {{
 *   brand: PromiseSpaceOf<{
 *     Tribbles: import('@agoric/ertp/src/types.js').Brand;
 *   }>;
 *   issuer: PromiseSpaceOf<{
 *     Tribbles: import('@agoric/ertp/src/types.js').Issuer;
 *   }>;
 *   instance: PromiseSpaceOf<{ [contractName]: Instance }>;
 * }} AirdropSpace
 */
export const startAirdrop = async (powers, config) => {
  trace('######## inside startAirdrop ###########');
  trace('config ::::', config);
  trace('----------------------------------');
  trace('powers::', powers);
  trace('powers.installation', powers.installation.consume);
  trace('powers.installation', powers.installation.consume[contractName]);
  const {
    consume: { board, chainTimerService, chainStorage, startUpgradable, zoe },
    installation: {
      consume: { [contractName]: airdropInstallationP },
    },
    instance: {
      produce: { [contractName]: produceInstance },
    },
    issuer: {
      consume: { IST: istIssuer },
      produce: { Tribbles: produceTribblesIssuer },
    },
    brand: {
      consume: { IST: istBrand },
      produce: { Tribbles: produceTribblesBrand },
    },
  } = powers;

  const [issuerIST, feeBrand, timer, storageNode] = await Promise.all([
    istIssuer,
    istBrand,
    chainTimerService,
    makeStorageNodeChild(chainStorage, contractName),
  ]);

  const { customTerms } = config.options;

  /** @type {CustomContractTerms} */
  const terms = {
    ...customTerms,
    feeAmount: harden({
      brand: feeBrand,
      value: 5n,
    }),
  };
  trace('BEFORE assert(config?.options?.merkleRoot');
  assert(
    customTerms?.merkleRoot,
    'can not start contract without merkleRoot???',
  );
  trace('AFTER assert(config?.options?.merkleRoot');

  const marshaller = await E(board).getReadonlyMarshaller();

  const startArgs = {
    installation: await airdropInstallationP,
    label: contractName,
    terms,
    issuerKeywordRecord: {
      Fee: issuerIST,
    },
    issuerNames: ['Tribbles'],
    privateArgs: await deeplyFulfilledObject(
      harden({
        timer,
        storageNode,
        marshaller,
      }),
    ),
  };
  trace('BEFORE astartContract(permittedPowers, startArgs);', { startArgs });

  const { instance } = await E(startUpgradable)(startArgs);
  trace('contract installation started');
  trace(instance);
  const instanceTerms = await E(zoe).getTerms(instance);
  trace('instanceTerms::', instanceTerms);
  const {
    brands: { Tribbles: tribblesBrand },
    issuers: { Item: tribblesIssuer },
  } = instanceTerms;

  produceInstance.reset();
  produceInstance.resolve(instance);

  produceTribblesBrand.reset();
  produceTribblesIssuer.reset();
  produceTribblesBrand.resolve(tribblesBrand);
  produceTribblesIssuer.resolve(tribblesIssuer);

  await publishBrandInfo(chainStorage, board, tribblesBrand);
  trace('deploy script complete.');
};

/** @type {import('@agoric/vats/src/core/lib-boot').BootstrapManifest} */
const airdropManifest = harden({
  [startAirdrop.name]: {
    consume: {
      board: true,
      chainStorage: true,
      chainTimerService: true,
      agoricNames: true,
      brandAuxPublisher: true,
      startUpgradable: true, // to start contract and save adminFacet
      zoe: true, // to get contract terms, including issuer/brand,
    },
    installation: {
      consume: { [contractName]: true },
      produce: { [contractName]: true },
    },
    issuer: { consume: { IST: true }, produce: { Tribbles: true } },
    brand: { consume: { IST: true }, produce: { Tribbles: true } },
    instance: { produce: { [contractName]: true } },
  },
});

export const getManifestForAirdrop = (
  { restoreRef },
  {
    installKeys,
    options = {
      customTerms: {
        ...defaultCustomTerms,
        merkleRoot:
          '9a2f65951204939963b32771032964b743991e7bba0a4ec11341e36d59b441f2',
      },
    },
  },
) => {
  trace('getManifestForAirdrop');
  trace('installKeys', installKeys);
  trace('options ::::', options);
  return harden({
    manifest: airdropManifest,
    installations: {
      tribblesAirdrop: restoreRef(installKeys.tribblesAirdrop),
    },
    options,
  });
};