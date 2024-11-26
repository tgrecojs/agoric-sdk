import anyTest from '@endo/ses-ava/prepare-endo.js';
import { makeDoOffer } from '../tools/e2e-tools.js';
import { commonSetup } from './support';
import type { SetupContext } from './support'
import { merkleTreeObj, mnemonics } from './generated_keys.js';
import type { TestFn } from 'ava';
import type { Brand } from '@agoric/ertp';


// 2. Type Alias with Intersection
type ExtendedSetupContext = SetupContext & {
  brands: [{ key: string, value: Brand }],
  instances: [{ key: string, value: Instance }]
  makeFeeAmount: () => Amount
};
const test = anyTest as TestFn<ExtendedSetupContext>
const contractName = 'tribblesAirdrop';
const contractBuilder =
  '../packages/builders/scripts/testing/start-tribbles-airdrop.js';

// Using startsWith() method
const checkSuccessMessage = (result) =>
  typeof result === 'string' && result.startsWith('Successfully claimed');

const trace = label => value => {
  console.log(label, ':::', value);
  return value
}
const generateInt = x => () => Math.floor(Math.random() * (x + 1));

const createTestTier = generateInt(4); // ?

const createPerformanceObject = (
  history) => (
    { account = { name: '', address: '', pubkey: { key: '' } }, startTime = 0, endTime = 0, isError = false, data = {}, message = ' ' },
  ) => ({
    offerIndex: history.length + 1,
    account,
    startTime,
    endTime,
    latency: endTime - startTime,
    isError,
    data,
    message
  });

const makeDoOfferHandler = async (
  currentAccount,
  wallet,
  feeAmount,
  createMetricsFn
) => {
  console.log(
    'claiming foxr account::',
    currentAccount.address,
    'pubkey',
    currentAccount.pubkey,
  );

  const doOffer = makeDoOffer(wallet);

  const startTime = performance.now();

  try {
    const response = await doOffer({
      id: `offer-${Date.now()}`,
      invitationSpec: {
        source: 'agoricContract',
        instancePath: [contractName],
        callPipe: [['makeClaimTokensInvitation']],
      },
      offerArgs: {
        proof: merkleTreeObj.constructProof(currentAccount.pubkey.key),
        address: currentAccount.address,
        key: currentAccount.pubkey.key,
        tier: createTestTier(),
      },
      proposal: {
        give: {
          Fee: feeAmount(),
        },
      },
    }).catch(err => {
      throw new Error(err)
    });

    return createMetricsFn({ data: response, message: 'Offer handled properly.', startTime, endTime: performance.now(), account: currentAccount })
  } catch (error) {
    return createMetricsFn({ data: error, message: 'Error while handling offer', isError: true, startTime, endTime: performance.now(), account: currentAccount })
  }
};



const claimAirdropMacro = accounts => async (t, accounts, delay) => {
  const { makeFeeAmount } = t.context;
  const durations: number[] = [];

  console.log('{accounts, wallets} ::::', { accounts, wallets });
  console.log('----------------------------------');
  // Make multiple API calls with the specified delay
  for (let i = 0; i < accounts.length - 1; i++) {

    const wallet = await t.cotext.provisionSmartWallet(accounts[i],)
    const metricsFn = createPerformanceObject(durations)
    const currentAccount = {
      wallet: wallets[i],
      account: accounts[0],
    };

    console.log('Curren Acccount', currentAccount);
    console.log('Current iteration::', i);

    // picking off duration and address
    // this can be used to inspect the validity of offer results, however it comes at the expense
    // of a failing test halting execution & destroying duration data
    const response = await makeDoOfferHandler(
      currentAccount.account,
      currentAccount.wallet,
      makeFeeAmount,
      metricsFn
    );

    durations.push(response);

    // Assert that the response matches the expected output

    console.log('----------------------------------');
    console.log('currentAccount.address ::::', response.address);
    console.log('----------------------------------');

    // Wait for the specified delay before making the next call
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  return durations;
};
// Milliseconds in one minute
const msInMinute = () => 1000 * 60 // 60000 ms

// Seconds in one hour  
const secondsInHour = () => 60 * 60 // 3600 seconds

const prepareAccountsForTests = (accounts = merkleTreeObj.accounts.slice(0, 10), range = [0, 1]) =>
  accounts.slice(range[0], range[1])
    .filter(x => !x.address === false);


test.before(async t => {
  const setup = await commonSetup(t);

  await setup.startContract(contractName, contractBuilder)
  await setup.setupSpecificKeys(mnemonics.slice(0, 50))

  console.log('successfully started contract::', contractName)
  // example usage. comment out after first run
  const chainData = await Promise.all([
    setup.vstorageClient.queryData('published.agoricNames.brand'),
    setup.vstorageClient.queryData('published.agoricNames.instance'),
  ]);

  const [brands, instances] = [Object.fromEntries(chainData[0]), Object.fromEntries(chainData[1])];

  const makeFeeAmount = () =>
    harden({ brand: brands.IST, value: 5n });

  t.context = {
    ...setup,
    provisionSmartWallet: setup.provisionSmartWallet,
    brands,
    instances,
    makeFeeAmount
  }
});

const runManyOffers = async (t, delay = 10000, accounts) => {
  const durations = [];

  for (let i = 0; i <= accounts.length - 1; i++) {

    const currentAccount = accounts[i];

    const sw = await t.context.provisionSmartWallet(currentAccount.address, {
      IST: 100n,
      BLD: 100n
    });
    console.log('wallet provisioned:::')

    const metricsFn = createPerformanceObject(durations)
    const currentAccountWithWallet = {
      wallet: sw,
      account: currentAccount
    };


    // this can be used to inspect the validity of offer results, however it comes at the expense
    // of a failing test halting execution & destroying duration data
    const response = await makeDoOfferHandler(
      currentAccountWithWallet.account,
      currentAccountWithWallet.wallet,
      t.context.makeFeeAmount,
      metricsFn
    );

    console.log('response from makeeDoOfferHandler', response);
    durations.push(response);

    // Assert that the response matches the expected output

    console.log('----------------------------------');
    console.log('currentAccount.address ::::', response.address);
    console.log('----------------------------------');

    // Wait for the specified delay before making the next call
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  return durations
}



test.serial(
  'makeClaimTokensInvitation offrs ### start: accounts[15] || end: accounts[35] ### offer interval: 10s',
  async t => {
    const { provisionSmartWallet, makeFeeAmount } = t.context;
    const [startIndex, endIndex] = [30, 45];
    const testAccts = merkleTreeObj.accounts
      .slice(startIndex, endIndex);

    console.log({ testAccts });


    const delay = 10000;
    const results = await runManyOffers(t, delay, testAccts)
    t.log('Durations for all calls', results);
    console.group('################ START DURATIONS logger ##############');
    console.log('----------------------------------------');
    console.log('durations ::::', results.map(trace('inspecting offer results')));
    console.log('----------------------------------------');
    console.log('--------------- END DURATIONS logger -------------------');
    console.groupEnd();
    t.deepEqual(results.length === 20, true);
  },
);


test.skip(
  'makeClaimTokensInvitation offrs ### start: accounts[205] || end: accounts[245] ### offer interval: 30s',
  async t => {
    const [startIndex, endIndex] = [0, 45];
    const testAccts = merkleTreeObj.accounts
      .slice(startIndex, endIndex);
    const results = await runManyOffers(t, 30000, testAccts)
    t.log('Durations for all calls', results);
    console.group('################ START DURATIONS logger ##############');
    console.log('----------------------------------------');
    console.log('durations ::::', results.map(trace('inspecting offer results')));
    console.log('----------------------------------------');
    console.log('--------------- END DURATIONS logger -------------------');
    console.groupEnd();
    t.deepEqual(results.length === 20, true);
  },
);

test.skip(
  'makeClaimTokensInvitation offrs ### start: accounts[65] || end: accounts[95] ### offer interval: 15s',
  async t => {
    const [startIndex, endIndex] = [65, 95];
    const testAccts = merkleTreeObj.accounts
      .slice(startIndex, endIndex);

    const delay = 15000;
    const results = await runManyOffers(t, delay, testAccts)
    t.log('Durations for all calls', results);
    console.group('################ START DURATIONS logger ##############');
    console.log('----------------------------------------');
    console.log('durations ::::', results.map(trace('inspecting offer results')));
    console.log('----------------------------------------');
    console.log('--------------- END DURATIONS logger -------------------');
    console.groupEnd();
    t.deepEqual(results.length === 40, true);
  },
);


// test.serial('makeClaimTokensInvitation offers ### start: accounts[20] || end: accounts[35] ### offer interval: 6s', async t => {
//   const claimRange = [20, 35];
//   const testAccounts = prepareAccountsForTests(merkleTreeObj.accounts, claimRange)
//   const makeClaimAirdropMacro = claimAirdropMacro(testAccounts);
//   const walletsP = await Promise.all(provisionWallets(testAccounts, t.context));

//   const testWallets = await walletsP;
//   const durations = await makeClaimAirdropMacro(t, testWallets, 4000);
//   t.log('Durations for all calls', durations);
//   console.group('################ START DURATIONS logger ##############');
//   console.log('----------------------------------------');
//   console.log('durations ::::', durations);
//   console.log('----------------------------------------');
//   console.log('claimRange ::::', claimRange);
//   console.log('--------------- END DURATIONS logger -------------------');
//   console.groupEnd();
//   t.deepEqual(durations.length === 30, true);
// });

// test.skip('makeClaimTokensInvitation offers ### start: accounts[30] || end: accounts[40] ### offer interval: 6s', async t => {
//   const claimRange = [35, 50];
//   const testAccounts = prepareAccountsForTests(accounts, claimRange)
//   const makeClaimAirdropMacro = claimAirdropMacro(testAccounts);
//   const walletsP = await Promise.all(provisionWallets(testAccounts, t.context));

//   const testWallets = await walletsP;
//   const durations = await makeClaimAirdropMacro(t, testWallets, 4000);
//   t.log('Durations for all calls', durations);
//   console.group('################ START DURATIONS logger ##############');
//   console.log('----------------------------------------');
//   console.log('durations ::::', durations);
//   console.log('----------------------------------------');
//   console.log('claimRange ::::', claimRange);
//   console.log('--------------- END DURATIONS logger -------------------');
//   console.groupEnd();
//   t.deepEqual(durations.length === 40, true);
// });
