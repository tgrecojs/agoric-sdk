import anyTest from '@endo/ses-ava/prepare-endo.js';
import { commonSetup } from './support.js';

const test = anyTest;
const contractName = 'tribblesAirdrop';
const contractBuilder =
  '../packages/builders/scripts/testing/start-tribbles-airdrop.js';
import { accounts, mnemonics, pubkeys } from './keyring.js';
import { Either, Task } from './ADTs/monads.js';
import { useChain } from 'starshipjs';
import { makeRetryUntilCondition } from '../tools/sleep';
import { makeDoOffer } from '../tools/e2e-tools.js';
import { makeMerkleTreeAPI } from './makeMerkleAPI.js';

const Sum = (value = 0) => ({
  value,
  concat: ({ otherValue }) => Sum(value + otherValue),
  inspect: () => `Sum(${value})`,
});

Sum.empty = () => Sum(0);

const updateContextValue = async (t, prop) => {
  const { context } = await t;
  t.context = {
    ...t.context,
    [t.context[prop]]: [t.context[prop]].concat(Sum(1))
  }
  return t.context;
};

const sequenceCounter = {
  testSequence: Sum(0)
}

const and = (x, y) => x && y;
const evaluateStartExec = (instances, instanceName, deployFn, force = false) => and(instances[instanceName], !force) ? instances[instanceName] : deployFn();
// test.before(() => async t => {
//   const {
//     setupSpecificKeys,
//     provisionSmartWallet,
//     useChain,
//     vstorageClient, ...rest } = await commonSetup(t);


//   const [brands, instances] = await Promise.all([
//     vstorageClient.queryChildren('published.agoricNames.brand'),
//     vstorageClient.queryChildren('published.agoricNames.instance'),

//   ]);
//   const [group1, group2, group3, group4] = [
//     mnemonics.slice(0, 250),
//     mnemonics.slice(250, 500),
//     mnemonics.slice(500, 750),
//     mnemonics.slice(759)
//   ];

//   const IST = Object.fromEntries(brands).IST


//   // 

//   t.context = {
//     ...rest,
//     ...sequenceCounter,
//     startContract: rest.startContract,
//     setupSpecificKeys,
//     instances,
//     brands,
//     IST,
//     makeFeeAmount: () => ({ value: 5n, brand: IST }),
//     provisionSmartWallet,
//     group1,
//     group2,
//     group3,
//     testSequenceCount: Sum.empty(),
//     vstorageClient,
//     useChain
//   };

// });

const createStore = (reducerFn, initialState = {}) => {
  let state = initialState;
  const getSlice = prop => state[prop];
  const getStore = () => state;
  const getState = () => state;

  const dispatch = action => {
    return (state = reducerFn(state, action));
  };
  return {
    getStore,
    getSlice,
    getState,
    dispatch,
  };
};

// verify the account does not already exists.
// look up the tier that a user falls into
//

export { createStore };


const generateInt = x => () => Math.floor(Math.random() * (x + 1));

const createTestTier = generateInt(4); // ?

test.before(async t => {
  const setup = await commonSetup(t);

  // example usage. comment out after first run
  await setup.setupSpecificKeys(mnemonics.slice(0, 350));
  const [brands] = await Promise.all([
    setup.vstorageClient.queryData('published.agoricNames.brand'),
  ]);
  const makeFeeAmount = () =>
    harden({ brand: Object.fromEntries(brands).IST, value: 5n });

  await setup.startContract(contractName, contractBuilder)
  t.context = {
    ...setup,
    provisionSmartWallet: setup.provisionSmartWallet,
    brands,
    metricsStore: createStore(updatePerformanceMetrics),

    merkleTreeAPI: makeMerkleTreeAPI(pubkeys, accounts),
    makeFeeAmount,
    performanceMetrics: {
      currentSequence: Sum(0),
      pastSequenceHistory: [],
      currentSequenceHistory: []
    }
  };
});

const OFFER_RESULT_TYPES = {
  SUCCESS: 'SUCCESS',
  FAILURE: 'FAILURE',
  ERROR: 'ERROR'
}

const createPerformanceObject = (history, { startTime = 0, endTime = 0, error = null, data = {} }) => ({
  index: history.length + 1,
  startTime,
  endTime,
  latency: endTime - startTime,
  error,
  data
});

const addHistoryItem = (state) => (newEntry) => ({
  ...state,
  lastResponse: newEntry,
  history: state.history.concat(newEntry)
})

const updatePerformanceMetrics = (state = {
  history: [], lastResponse: {
    error: null,
    startTime: null,
    endTime: null,
    data: null
  }
}, { type, payload }) => {
  switch (type) {
    case OFFER_RESULT_TYPES.FAILURE: {
      console.log('INSIDE FAILRE CASE ::::', type);
      console.log('----------------------------------')
      return { history: [...state.history, createPerformanceObject(state.history, payload)] }
    }
    case OFFER_RESULT_TYPES.SUCCESS: {
      console.log('INSIDE SUCCESS CASE ::::', type);
      console.log('----------------------------------');
      return { history: [...state.history, createPerformanceObject(state.history, payload)] }
    }
    default:
      {
        console.log(`Action type not recognized: ${type}.`)
        console.log(`Returning current state::`, state);
        return state
      }
  }
}

const makeDoOfferHandler = (metricsStore) => async (
  merkleTreeAPI,
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

  const proof = merkleTreeAPI.constructProof(currentAccount.pubkey.key);
  const offerArgs = {
    proof,
    address: currentAccount.address,
    key: currentAccount.pubkey.key,
    tier: createTestTier(),
  };

  const startTime = performance.now();



  return Either.tryCatch(async () => {
    const start = performance.now();
    const response = await doOffer({
      id: `offer-${Date.now()}`,
      invitationSpec: {
        source: 'agoricContract',
        instancePath: [contractName],
        callPipe: [['makeClaimTokensInvitation']],
      },
      offerArgs,
      proposal: {
        give: {
          Fee: feeAmount(),
        },
      },
    })
    return metricsStore.dispatch({
      type: OFFER_RESULT_TYPES.SUCCESS, payload: createPerformanceObject(metricsStore.getState().history,
        { data: response, startTime: start, endTime: performance.now() })
    }).fold(err => metricsStore.dispatch({
      type: OFFER_RESULT_TYPES.FAILURE, payload: createPerformanceObject(metricsStore.getState().history, {
        start: startTime,
        endtime: performance.now(),
        error: true,
        data: err
      })
    }), x => x)
  }
}
const provisionWallets = (accounts, { provisionSmartWallet }) =>
  accounts.map(async ({ address }) => {
    const wallet = await provisionSmartWallet(address, {
      BLD: 1000n,
      IST: 500n,
    });
    return wallet;
  });
const claimAirdropMacro = accounts => async (t, wallets, delay) => {
  const { useChain, makeFeeAmount, metricsStore } = t.context;
  const durations: number[] = [];

  console.log('{accounts, wallets} ::::', { accounts, wallets });
  console.log('----------------------------------');

  const withPerfomanceState = makeDoOfferHandler(metricsStore)
  // Make multiple API calls with the specified delay
  for (let i = 0; i < accounts.length - 1; i++) {
    const currentAccount = {
      wallet: wallets[i],
      account: accounts[0],
    };

    console.log('Curren Acccount', currentAccount);
    console.log('Current iteration::', i);

    // picking off duration and address
    // this can be used to inspect the validity of offer results, however it comes at the expense
    // of a failing test halting execution & destroying duration data
    const resullt = await withPerfomanceState(
      useChain,
      currentAccount.account,
      currentAccount.wallet,
      makeFeeAmount,
    );

    durations.push(resullt);

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
    const claimRange = [10, 11];
    const testAccts = accounts
      .slice(claimRange[0], claimRange[1])
      .filter(x => !x.address === false);

    console.log({ testAccts });

    const makeClaimAirdropMacro = claimAirdropMacro(testAccts);

    const walletsP = await Promise.all(provisionWallets(testAccts, t.context));
    const durations = await makeClaimAirdropMacro(t, await walletsP, 3000);
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

// test.skip('makeClaimTokensInvitation offers ### start: accounts[5] || end: accounts[15] ### offer interval: 3000ms', async t => {
//   const claimRange = [5, 15];

//   const durations = await claimAirdropMacro(t, claimRange, 3000);
//   t.log('Durations for all calls', durations);
//   console.group('################ START DURATIONS logger ##############');
//   console.log('----------------------------------------');
//   console.log('durations ::::', durations);
//   console.log('----------------------------------------');
//   console.log('claimRange ::::', claimRange);
//   console.log('--------------- END DURATIONS logger -------------------');
//   console.groupEnd();
//   t.deepEqual(durations.length === 10, true);
// });

// test.skip('makeClaimTokensInvitation offers ### start: accounts[25] || end: accounts[29] ### offer interval: 3500ms', async t => {
//   const claimRange = [25, 29];
//   const durations = await claimAirdropMacro(t, claimRange, 3500);
//   t.log('Durations for all calls', durations);
//   console.group('################ START DURATIONS logger ##############');
//   console.log('----------------------------------------');
//   console.log('durations ::::', durations);
//   console.log('----------------------------------------');
//   console.log('claimRange ::::', claimRange);
//   console.log('--------------- END DURATIONS logger -------------------');
//   console.groupEnd();
//   t.deepEqual(durations.length === 4, true);
// });

// test.skip('makeClaimTokensInvitation offers ### start: accounts[40] || end: accounts[90] ### offer interval: 6000ms', async t => {
//   const claimRange = [40, 90];
//   const durations = await claimAirdropMacro(t, claimRange, 6000);
//   t.log('Durations for all calls', durations);
//   console.group('################ START DURATIONS logger ##############');
//   console.log('----------------------------------------');
//   console.log('durations ::::', durations);
//   console.log('----------------------------------------');
//   console.log('claimRange ::::', claimRange);
//   console.log('--------------- END DURATIONS logger -------------------');
//   console.groupEnd();
//   t.deepEqual(durations.length === 50, true);
// });
