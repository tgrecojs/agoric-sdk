import anyTest from '@endo/ses-ava/prepare-endo.js';
import { makeDoOffer } from '../tools/e2e-tools.js';
import { commonSetup } from './support.js';
import { accounts } from './keyring.js';

// import { merkleTreeAPI } from './airdrop-data/merkle-tree/index.js';
import { merkleTreeObj } from '@agoric/orchestration/src/examples/airdrop/generated_keys.js';

const test = anyTest;
const contractName = 'tribblesAirdrop';
const contractBuilder =
  '../packages/builders/scripts/testing/start-tribbles-airdrop.js';

const generateInt = x => () => Math.floor(Math.random() * (x + 1));

const createTestTier = generateInt(4); // ?

test.before(async t => {
  const setup = await commonSetup(t);

  // example usage. comment out after first run
  //  await setupSpecificKeys(MNEMONICS_SET_1);
  const [brands] = await Promise.all([
    setup.vstorageClient.queryData('published.agoricNames.brand'),
  ]);
  const makeFeeAmount = () =>
    harden({ brand: Object.fromEntries(brands).IST, value: 5n });

  t.context = {
    ...setup,
    brands,
    makeFeeAmount,
  };
});

const makeDoOfferHandler = async (
  _useChain,
  currentAccount,
  wallet,
  feeAmount,
) => {
  console.log(
    'claiming foxr account::',
    currentAccount.address,
    'pubkey',
    currentAccount.pubkey,
  );

  const doOffer = makeDoOffer(wallet);

  const proof = merkleTreeObj.constructProof(currentAccount.pubkey.key);
  const offerArgs = {
    proof,
    address: currentAccount.address,
    key: currentAccount.pubkey.key,
    tier: createTestTier(),
  };
  // const offerArgs2 = makeOfferArgs(currentAccount);
  console.group(
    '################ START makeDoOfferHandler logger ##############',
  );
  console.log('----------------------------------------');
  console.log('proof ::::', proof);
  console.log('----------------------------------------');
  console.log('offerArgs ::::', offerArgs);
  console.log(
    '--------------- END makeDoOfferHandler logger -------------------',
  );
  console.groupEnd();
  const startTime = performance.now();

  await doOffer({
    id: `offer-${Date.now()}`,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: [contractName],
      callPipe: [['makeClaimTokensInvitation']],
    },
    offerArgs,
    proposal: {
      give: {
        Fee: feeAmount,
      },
    },
  });

  const duration = performance.now() - startTime;
  return { ...currentAccount, duration, wallet };
};

const provisionWallets = (accounts, { provisionSmartWallet }) =>
  accounts.map(({ address }) =>
    provisionSmartWallet(address, {
      BLD: 1000n,
      IST: 500n,
    }),
  );
const claimAirdropMacro = async (t, claimRange, wallets, delay) => {
  const { useChain, makeFeeAmount } = t.context;
  const durations: number[] = [];

  // Make multiple API calls with the specified delay
  for (let i = 0; i < wallets.length - 1; i++) {
    const currentAccount = {
      wallet: wallets[i],
      account: claimRange[0] + i,
    };

    console.log('Curren Acccount', currentAccount);
    console.log('Current iteration::', i);

    // picking off duration and address
    // this can be used to inspect the validity of offer results, however it comes at the expense
    // of a failing test halting execution & destroying duration data
    const { duration, address } = await makeDoOfferHandler(
      useChain,
      currentAccount.account,
      currentAccount.wallet,
      makeFeeAmount,
    );

    durations.push(duration);

    // Assert that the response matches the expected output

    console.log('----------------------------------');
    console.log('currentAccount.address ::::', address);
    console.log('----------------------------------');

    // Wait for the specified delay before making the next call
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  return durations;
};

test.serial(
  'makeClaimTokensInvitation offrs ### start: accounts[3] || end: accounts[4] ### offer interval: 3000ms',
  async t => {
    const claimRange = [32, 34];
    const testAccts = accounts
      .slice(claimRange[0], claimRange[1])
      .filter(x => !x.address === false);

    console.log({ testAccts });
    const wallets = await Promise.all(provisionWallets(testAccts, t.context));

    const durations = await claimAirdropMacro(t, claimRange, wallets, 3000);
    t.log('Durations for all calls', durations);
    console.group('################ START DURATIONS logger ##############');
    console.log('----------------------------------------');
    console.log('durations ::::', durations);
    console.log('----------------------------------------');
    console.log('claimRange ::::', claimRange);
    console.log('--------------- END DURATIONS logger -------------------');
    console.groupEnd();
    t.deepEqual(durations.length === 10, true);
  },
);
const newLocal = provisionSmartWallet =>
  AIRDROP_DATA.accounts.slice(5, 15).map(async accountData => {
    const wallet = await provisionSmartWallet(accountData.address);
    return wallet;
  });

test.skip('makeClaimTokensInvitation offers ### start: accounts[5] || end: accounts[15] ### offer interval: 3000ms', async t => {
  const claimRange = [5, 15];

  const durations = await claimAirdropMacro(t, claimRange, 3000);
  t.log('Durations for all calls', durations);
  console.group('################ START DURATIONS logger ##############');
  console.log('----------------------------------------');
  console.log('durations ::::', durations);
  console.log('----------------------------------------');
  console.log('claimRange ::::', claimRange);
  console.log('--------------- END DURATIONS logger -------------------');
  console.groupEnd();
  t.deepEqual(durations.length === 10, true);
});

test.skip('makeClaimTokensInvitation offers ### start: accounts[25] || end: accounts[29] ### offer interval: 3500ms', async t => {
  const claimRange = [25, 29];
  const durations = await claimAirdropMacro(t, claimRange, 3500);
  t.log('Durations for all calls', durations);
  console.group('################ START DURATIONS logger ##############');
  console.log('----------------------------------------');
  console.log('durations ::::', durations);
  console.log('----------------------------------------');
  console.log('claimRange ::::', claimRange);
  console.log('--------------- END DURATIONS logger -------------------');
  console.groupEnd();
  t.deepEqual(durations.length === 4, true);
});

test.skip('makeClaimTokensInvitation offers ### start: accounts[40] || end: accounts[90] ### offer interval: 6000ms', async t => {
  const claimRange = [40, 90];
  const durations = await claimAirdropMacro(t, claimRange, 6000);
  t.log('Durations for all calls', durations);
  console.group('################ START DURATIONS logger ##############');
  console.log('----------------------------------------');
  console.log('durations ::::', durations);
  console.log('----------------------------------------');
  console.log('claimRange ::::', claimRange);
  console.log('--------------- END DURATIONS logger -------------------');
  console.groupEnd();
  t.deepEqual(durations.length === 50, true);
});
