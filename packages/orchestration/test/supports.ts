import { makeIssuerKit } from '@agoric/ertp';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { prepareLocalChainTools } from '@agoric/vats/src/localchain.js';
import { makeFakeBankManagerKit } from '@agoric/vats/tools/bank-utils.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { makeFakeLocalchainBridge } from '@agoric/vats/tools/fake-bridge.js';
import type { Installation } from '@agoric/zoe/src/zoeService/utils.js';
import { buildZoeManualTimer } from '@agoric/zoe/tools/manualTimer.js';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import { makeHeapZone } from '@agoric/zone';
import { E } from '@endo/far';
import { makeNameHubKit } from '@agoric/vats';
import { makeWellKnownSpaces } from '@agoric/vats/src/core/utils.js';
import { fakeNetworkEchoStuff } from './network-fakes.js';
import { prepareOrchestrationTools } from '../src/service.js';
import { CHAIN_KEY } from '../src/facade.js';
import type { CosmosChainInfo } from '../src/cosmos-api.js';
import {
  registerChainNamespace,
  wellKnownChainInfo,
} from '../src/chain-info.js';

export { makeFakeLocalchainBridge } from '@agoric/vats/tools/fake-bridge.js';

export const commonSetup = async t => {
  t.log('bootstrap vat dependencies');
  // The common setup cannot support a durable zone because many of the fakes are not durable.
  // They were made before we had durable kinds (and thus don't take a zone or baggage).
  // To test durability in unit tests, test a particular entity with `relaxDurabilityRules: false`.
  // To test durability integrating multiple vats, use a RunUtils/bootstrap test.
  const rootZone = makeHeapZone();
  const bld = withAmountUtils(makeIssuerKit('BLD'));
  const ist = withAmountUtils(makeIssuerKit('IST'));

  const { bankManager, pourPayment } = await makeFakeBankManagerKit();
  await E(bankManager).addAsset('ubld', 'BLD', 'Staking Token', bld.issuerKit);
  await E(bankManager).addAsset(
    'uist',
    'IST',
    'Inter Stable Token',
    ist.issuerKit,
  );

  const localchainBridge = makeFakeLocalchainBridge(rootZone);
  const localchain = prepareLocalChainTools(
    rootZone.subZone('localchain'),
  ).makeLocalChain({
    bankManager,
    system: localchainBridge,
  });
  const timer = buildZoeManualTimer(t.log);
  const marshaller = makeFakeBoard().getReadonlyMarshaller();
  const storage = makeFakeStorageKit('mockChainStorageRoot', {
    sequence: false,
  });

  const { makeOrchestrationKit } = prepareOrchestrationTools(
    rootZone.subZone('orchestration'),
  );

  const { portAllocator } = fakeNetworkEchoStuff(rootZone.subZone('network'));
  const { public: orchestration } = makeOrchestrationKit({ portAllocator });

  const { nameHub: agoricNames, nameAdmin: agoricNamesAdmin } =
    makeNameHubKit();

  await registerChainNamespace(agoricNamesAdmin, t.log);

  return {
    bootstrap: {
      agoricNames,
      bankManager,
      timer,
      localchain,
      marshaller,
      orchestration,
      rootZone,
      storage,
    },
    brands: {
      // TODO consider omitting `issuer` to prevent minting, which the bank can't observe
      bld,
      ist,
    },
    commonPrivateArgs: {
      agoricNames,
      localchain,
      orchestrationService: orchestration,
      storageNode: storage.rootNode,
      timerService: timer,
    },
    facadeServices: {
      agoricNames,
      localchain,
      orchestrationService: orchestration,
      timerService: timer,
    },
    utils: {
      pourPayment,
    },
  };
};

export const makeDefaultContext = <SF>(contract: Installation<SF>) => {};