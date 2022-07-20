// @ts-check
import {
  AminoTypes,
  SigningStargateClient,
  defaultRegistryTypes,
} from '@cosmjs/stargate';
import { fromBech32, toBech32, fromBase64, toBase64 } from '@cosmjs/encoding';
import { DirectSecp256k1Wallet, Registry } from '@cosmjs/proto-signing';
import { IO, Maybe, Either, IOHelpers, AsyncEither } from 'monio';
import {
  AGORIC_COIN_TYPE,
  COSMOS_COIN_TYPE,
  stakeCurrency,
  stableCurrency,
  bech32Config,
  SwingsetMsgs,
} from '../../chainInfo.js';
import { MsgWalletAction } from '../../gen/swingset/msgs.js';
import {
  makeExecMessage,
  makeFeeGrantMessage,
  makeGrantWalletActionMessage,
  makeMessagingSigner,
} from '../../messagingKey.js';

const trace = label => value => {
  console.log(`${label}::`, value);
  return value;
};
const safeHtmlInputs = expected => actual =>
  Object.getPrototypeOf(actual) === expected;

// helpers:
const getProp = prop => obj => obj[prop];
const getPrototype = getProp('prototype');
const buttonEl = x => getPrototype(HTMLButtonElement)(x);
const inputEl = x => getPrototype(HTMLInputElement)(x);
const textAreaEl = x => getPrototype(HTMLTextAreaElement)(x);
const selectEl = x => getPrototype(HTMLSelectElement)(x);

const safeBtn = safeHtmlInputs(buttonEl);
const safeTextArea = safeHtmlInputs(textAreaEl);
const safeInput = safeHtmlInputs(inputEl);
const safeSelectInput = safeHtmlInputs(selectEl);

const equals = (x, y) => x === y;

const { freeze } = Object;
const { Just, Nothing } = Maybe;
const { Left, Right } = Either;
const { do: doIO } = IO;
const getValue = getProp('value');

const tryCatch = fn => {
  try {
    return Right(fn());
  } catch (error) {
    return Left(error);
  }
};
const isNotNull = x => ctx => !x ? new Error(`null/undefined $${ctx}`) : x;
const safeNullCheck = (x, y) =>
  tryCatch(() =>
    isNotNull(x)(y).fold(
      err => new Error(`null/undefined $${err}`),
      el => getValue(el),
    ),
  );

const handleErrorMessage =
  (errorMsg = 'default error') =>
  (uiMessage = '') =>
    new Error(errorMsg.concat(' ', uiMessage));
const id = x => x;
const { log } = IOHelpers;
const safeBtnCheck = x => tryCatch(() => safeBtn(x));
const safeInputCheck = x => tryCatch(() => safeInput(x));
const safeTextAreaCheck = x => tryCatch(() => safeTextArea(x));

const check = {
  /**
   * @param {T?} x
   * @param { string= } context
   * @returns { T }
   * @template T
   */
  notNull(x, context) {
    return safeNullCheck(x, context).fold(id, id);
  },

  theButton(elt) {
    console.log({
      elt,
      safe: safeBtnCheck(elt),
      tr: tryCatch(() => safeBtn(elt)).fold(id, id),
    });
    return safeBtnCheck(elt).fold(
      handleErrorMessage('Input is not a button'),
      () => elt,
    );
  },

  theInput(elt) {
    console.log({ elt, d: safeInput(elt) });
    return safeInputCheck(elt).fold(
      handleErrorMessage('element is not an input box'),
      getValue,
    );
  },

  theTextArea(elt) {
    console.log({ elt, d: safeInput(elt) });

    return safeInputCheck(elt).fold(
      handleErrorMessage('element is not an input box'),
      getValue,
    );
  },

  theSelect(elt) {
    return safeTextAreaCheck(elt).fold(
      handleErrorMessage('element is not an input box'),
      () => elt,
    );
  },
};

/**
 * @typedef {{
 *   typeUrl: '/agoric.swingset.MsgWalletAction',
 *   value: {
 *     owner: string, // base64 of raw bech32 data
 *     action: string,
 *   }
 * }} WalletAction
 */

/** @type {(address: string) => Uint8Array} */
export function toAccAddress(address) {
  return fromBech32(address).data;
}

/** @type {import('@cosmjs/stargate').AminoConverters} */
const SwingsetConverters = {
  // '/agoric.swingset.MsgProvision': {
  //   /* ... */
  // },
  [SwingsetMsgs.MsgWalletAction.typeUrl]: {
    aminoType: SwingsetMsgs.MsgWalletAction.aminoType,
    toAmino: proto => {
      const { action, owner } = proto;
      // NOTE: keep "dictionaries" sorted
      const amino = {
        action,
        owner: toBech32(bech32Config.bech32PrefixAccAddr, fromBase64(owner)),
      };
      console.log('@@toAmino:', { proto, amino });
      return amino;
    },
    fromAmino: amino => {
      const { action, owner } = amino;
      const proto = { action, owner: toBase64(toAccAddress(owner)) };
      console.log('@@fromAmino:', { amino, proto });
      return proto;
    },
  },
};

const aRegistry = new Registry([
  ...defaultRegistryTypes,
  [SwingsetMsgs.MsgWalletAction.typeUrl, MsgWalletAction],
]);

// agoric start local-chain
const localChainInfo = {
  rpc: 'http://localhost:26657',
  // rest: api,
  chainId: 'agoric',
  chainName: 'Agoric local-chain',
  stakeCurrency,
  // walletUrlForStaking: `https://${network}.staking.agoric.app`,
  bip44: {
    coinType: COSMOS_COIN_TYPE,
    // coinType: AGORIC_COIN_TYPE, // ISSUE: how do we switch on this before we know isNanoLedger?
  },
  bech32Config,
  currencies: [stakeCurrency, stableCurrency],
  feeCurrencies: [stableCurrency],
  features: ['stargate', 'ibc-transfer'],
};
export const makeChainConfig = (obj = localChainInfo) => ({
  ...localChainInfo,
  obj,
});

/**
 * @param {ReturnType<typeof makeUI>} ui
 * @param {*} keplr
 * @param {typeof SigningStargateClient.connectWithSigner} connectWithSigner
 */
const makeSigner = async (ui, keplr, connectWithSigner) => {
  // const chainId = ui.selectValue('select[name="chainId"]');
  // console.log({ chainId });

  const chainInfo = localChainInfo;
  const { chainId } = chainInfo;
  ui.setValue('*[name="chainId"]', chainId);
  const { coinMinimalDenom: denom } = stableCurrency;

  await keplr.experimentalSuggestChain(chainInfo);
  await keplr.enable(chainId);

  // https://docs.keplr.app/api/#get-address-public-key
  const key = await keplr.getKey(chainId);
  console.log({ key });

  ui.setChecked('*[name="isNanoLedger"]', key.isNanoLedger);

  // const offlineSigner = await keplr.getOfflineSignerOnlyAmino(chainId);
  const offlineSigner = await keplr.getOfflineSignerAuto(chainId);
  console.log({ offlineSigner });

  // Currently, Keplr extension manages only one address/public key pair.
  const [account] = await offlineSigner.getAccounts();
  const { address } = account;
  ui.setValue('*[name="account"]', address);

  const cosmJS = await connectWithSigner(chainInfo.rpc, offlineSigner, {
    aminoTypes: new AminoTypes(SwingsetConverters),
    registry: aRegistry,
  });
  console.log({ cosmJS });

  const fee = {
    amount: [{ amount: '100', denom }],
    gas: '100000', // TODO: estimate gas?
  };
  const allowance = '250000'; // 0.25 IST

  return freeze({
    address, // TODO: address can change
    authorizeMessagingKey: async (grantee, t0) => {
      const expiration = t0 / 1000 + 4 * 60 * 60;
      const msgs = [
        makeGrantWalletActionMessage(address, grantee, expiration),
        makeFeeGrantMessage(address, grantee, allowance, expiration),
      ];
      console.log('sign', { address, msgs, fee });
      const tx = await cosmJS.signAndBroadcast(address, msgs, fee, '');

      console.log({ tx });
      return tx;
    },
    acceptOffer: async (action, memo) => {
      const { accountNumber, sequence } = await cosmJS.getSequence(address);
      console.log({ accountNumber, sequence });

      /** @type {WalletAction} */
      const act1 = {
        typeUrl: '/agoric.swingset.MsgWalletAction', // TODO: SpendAction
        value: {
          owner: toBase64(toAccAddress(address)),
          action,
        },
      };

      const msgs = [act1];

      // const signDoc = {
      //   chain_id: chainId,
      //   account_number: `${accountNumber}`,
      //   sequence: `${sequence}`,
      //   fee,
      //   memo,
      //   msgs,
      // };

      // const tx = await cosmJS.signAmino(chainId, account.address, signDoc);
      // const signerData = { accountNumber, sequence, chainId };
      console.log('sign', { address, msgs, fee, memo });

      // const tx = await offlineSigner.signAmino(address, signDoc);

      const tx = await cosmJS.signAndBroadcast(address, msgs, fee, memo);

      console.log({ tx });
      return tx;
    },
  });
};

/** @param {typeof document} document */
const makeUI = document => {
  return freeze({
    /** @param { string } selector */
    inputValue: selector => check.theInput(document.querySelector(selector)),
    textValue: selector => check.theTextArea(document.querySelector(selector)),
    setValue: (selector, value) =>
      (check.theInput(document.querySelector(selector)).value = value),
    setChecked: (selector, value) =>
      (check.theInput(document.querySelector(selector)).checked = value),
    /** @param { string } selector */
    selectValue: selector => {
      const sel = check.theSelect(document.querySelector(selector));
      return sel.options[sel.selectedIndex].value;
    },
    onClick: (selector, handler) =>
      check
        .theButton(document.querySelector(selector))
        .addEventListener('click', handler),
    showItems: (selector, items) => {},
    // render(
    //   html`<ul>
    //     ${items.map(item => html`<li>${item}</li>`)}
    //   </ul>`,
    //   document.querySelector(selector),
    // ),
  });
};

<<<<<<< HEAD:packages/wallet/ui/demo-signing/src/features/keplr/keplr-ledger-demo.js
typeof window !== 'undefined' &&
  window.addEventListener('load', async _ev => {
    if (!('keplr' in window)) {
      // eslint-disable-next-line no-alert
      alert('Please install keplr extension');
    }
    // @ts-expect-error keplr is injected
    const { keplr } = await window;
    console.log({ window });
    const ui = makeUI(document);

    const s1 = await makeSigner(
      ui,
      keplr,
      SigningStargateClient.connectWithSigner,
    );

    ui.onClick('#sign', async _bev =>
      s1.sign(
        ui.textValue('*[name="action"]'),
        ui.inputValue('*[name="memo"]'),
      ),
    );
=======
window.addEventListener('load', async _ev => {
  if (!('keplr' in window)) {
    // eslint-disable-next-line no-alert
    alert('Please install keplr extension');
  }
  // @ts-expect-error keplr is injected
  const { keplr } = window;
  const ui = makeUI(document);

  const s1 = await makeSigner(
    ui,
    keplr,
    SigningStargateClient.connectWithSigner,
  );

  ui.onClick('#acceptOffer', async _bev =>
    s1.acceptOffer(
      ui.textValue('*[name="spendAction"]'),
      ui.inputValue('*[name="memo"]'),
    ),
  );
>>>>>>> a921199bf450530ab34e898d0a8e9c83d4974150:packages/wallet/ui/demo-signing/src/keplr-ledger-demo.js

    const s2 = await makeMessagingSigner({
      localStorage: window.localStorage,
    });
    ui.setValue('*[name="messagingAccount"]', s2.address);

<<<<<<< HEAD:packages/wallet/ui/demo-signing/src/features/keplr/keplr-ledger-demo.js
    ui.onClick('#makeMessagingAccount', async _bev =>
      s1.authorizeMessagingKey(s2.address, Date.now()),
    );
  });
=======
  ui.onClick('#makeMessagingAccount', async _bev =>
    s1.authorizeMessagingKey(s2.address, Date.now()),
  );

  const chainInfo = localChainInfo;
  const lowPrivilegeClient = await SigningStargateClient.connectWithSigner(
    chainInfo.rpc,
    s2.wallet,
    {
      registry: aRegistry,
    },
  );
  console.log({ lowPrivilegeClient });
  console.log('low priv signer accounts', await s2.wallet.getAccounts());

  ui.onClick('#sendMessages', async _bev => {
    const { address } = s2;
    const { accountNumber, sequence } = await lowPrivilegeClient.getSequence(
      address,
    );
    console.log({ accountNumber, sequence });

    const act1 = {
      typeUrl: '/agoric.swingset.MsgWalletAction',
      value: {
        owner: toBase64(toAccAddress(s1.address)),
        action: ui.inputValue('*[name="action"]'),
      },
    };
    const msgs = [makeExecMessage(s2.address, [act1])];
    const memo = ui.inputValue('*[name="memo"]');

    const { coinMinimalDenom: denom } = stableCurrency;
    const fee = {
      amount: [{ amount: '0', denom }],
      gas: '100000', // TODO: estimate gas?
    };

    console.log('sign', { address, msgs, fee, memo });
    const tx = await lowPrivilegeClient.signAndBroadcast(
      address,
      msgs,
      fee,
      memo,
    );

    console.log({ tx });
  });
});
>>>>>>> a921199bf450530ab34e898d0a8e9c83d4974150:packages/wallet/ui/demo-signing/src/keplr-ledger-demo.js
