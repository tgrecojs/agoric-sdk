/** global fetch */
/* eslint-env node */
import test from 'ava';
import {
  fetchEnvNetworkConfig,
  makeSmartWalletKit,
} from '@agoric/client-utils';

// Utility functions
const isNull = obj => obj === null || obj === undefined;
const isObject = value => typeof value === 'object' && !isNull(value);
const createIndent = depth => '---'.repeat(depth);
const log = message => console.info(message);

// Main recursive function using functional composition
const inspectObject = (obj, depth = 0) =>
  isNull(obj)
    ? log('null or undefined')
    : Object.entries(obj).reduce((_, [key, value]) => {
        const indent = createIndent(depth);
        log(`${indent}${key}:`);
        return isObject(value)
          ? inspectObject(value, depth + 1)
          : log(`${indent}  ${value}`);
      }, null);

const getInstance = instanceName => walletKit =>
  Promise.resolve(walletKit.agoricNames.instance[instanceName]);

const getBrand = brandName => walletKit =>
  Promise.resolve(walletKit.agoricNames.brand[brandName]);

const handleFetchNetworkConfig = ({ env, fetch }) =>
  fetchEnvNetworkConfig({ env, fetch });

const handleMakeSmartWalletKit =
  ({ delay, fetch }) =>
  networkConfig =>
    makeSmartWalletKit({ delay, fetch }, networkConfig);

const trace = label => value => {
  console.log(label, '::::', value);
  return value;
};
const traceAsync = label => value => Promise.resolve(value).then(trace(label));

const composeM =
  method =>
  (...ms) =>
    ms.reduce((f, g) => x => g(x)[method](f));

const composePromises = composeM('then');

// Successfully
const collectPowers = config =>
  composePromises(
    trace('inspecting walletKit capabilities'),
    handleMakeSmartWalletKit(config),
    traceAsync('network config'),
    () => handleFetchNetworkConfig({ env: config.env, fetch: config.fetch }),
  );

test('serialize an offer spec', async t => {
  /**
   * @import {OfferSpec} from '@agoric/smart-wallet/src/offers.js';
   */
  const wk = await collectPowers({
    fetch,
    delay: () => 1234,
    env: { AGORIC_NET: 'xnet' },
  })();

  const contractInstanceName = 'tribblesXnetDeployment';
  /** @type {Brand} */

  const feeBrand = wk.agoricNames.brand.IST;

  /** @type {OfferSpec} */
  const offer = harden({
    id: 123,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: [contractInstanceName],
      callPipe: [['makeClaimTokensInvitation']],
    },
    proposal: { give: { Fee: { brand: feeBrand, value: 5n } } },
    // TODO: add in offerArgs
  });

  const capData = wk.marshaller.toCapData(offer);

  t.log('stringified::', JSON.stringify(capData));

  t.is(
    JSON.stringify(capData),
    '{"body":"#{\\"id\\":123,\\"invitationSpec\\":{\\"callPipe\\":[[\\"makeClaimTokensInvitation\\"]],\\"instancePath\\":[\\"tribblesXnetDeployment\\"],\\"source\\":\\"agoricContract\\"},\\"proposal\\":{\\"give\\":{\\"Fee\\":{\\"brand\\":\\"$0.Alleged: BoardRemoteIST brand\\",\\"value\\":\\"+5\\"}}}}","slots":["board0257"]}',
  );

  // t.deepEqual(capData, JSON.stringify(capData));
});
