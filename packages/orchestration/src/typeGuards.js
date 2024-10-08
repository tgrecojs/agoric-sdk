import { AmountShape } from '@agoric/ertp';
import { VowShape } from '@agoric/vow';
import { M } from '@endo/patterns';

/**
 * @import {TypedPattern} from '@agoric/internal';
 * @import {ChainAddress, CosmosAssetInfo, Chain, ChainInfo, CosmosChainInfo, DenomAmount, DenomDetail, DenomInfo} from './types.js';
 * @import {Delegation} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/staking.js';
 * @import {TxBody} from '@agoric/cosmic-proto/cosmos/tx/v1beta1/tx.js';
 * @import {TypedJson} from '@agoric/cosmic-proto';
 */

/**
 * Used for IBC Channel Connections that only send outgoing transactions. If
 * your channel expects incoming transactions, please extend this interface to
 * include the `onReceive` handler.
 */
export const OutboundConnectionHandlerI = M.interface(
  'OutboundConnectionHandler',
  {
    onOpen: M.callWhen(M.any(), M.string(), M.string(), M.any()).returns(
      M.any(),
    ),
    onClose: M.callWhen(M.any(), M.any(), M.any()).returns(M.any()),
  },
);

/** @type {TypedPattern<ChainAddress>} */
export const ChainAddressShape = {
  chainId: M.string(),
  encoding: M.string(),
  value: M.string(),
};

export const Proto3Shape = {
  typeUrl: M.string(),
  value: M.string(),
};

// FIXME missing `delegatorAddress` from the type
/** @type {TypedPattern<Delegation>} */
export const DelegationShape = harden({
  validatorAddress: M.string(),
  shares: M.string(), // TODO: bigint?
});

export const IBCTransferOptionsShape = M.splitRecord(
  {},
  {
    timeoutTimestamp: M.bigint(),
    timeoutHeight: {
      revisionHeight: M.bigint(),
      revisionNumber: M.bigint(),
    },
    memo: M.string(),
  },
);

export const IBCChannelIDShape = M.string();
export const IBCChannelInfoShape = M.splitRecord({
  portId: M.string(),
  channelId: IBCChannelIDShape,
  counterPartyPortId: M.string(),
  counterPartyChannelId: IBCChannelIDShape,
  ordering: M.scalar(), // XXX
  state: M.scalar(), // XXX
  version: M.string(),
});
export const IBCConnectionIDShape = M.string();
export const IBCConnectionInfoShape = M.splitRecord({
  id: IBCConnectionIDShape,
  client_id: M.string(),
  state: M.scalar(), // XXX STATE_OPEN or...
  counterparty: {
    client_id: M.string(),
    connection_id: IBCConnectionIDShape,
    prefix: {
      key_prefix: M.string(),
    },
  },
  transferChannel: IBCChannelInfoShape,
});

/** @type {TypedPattern<CosmosAssetInfo>} */
export const CosmosAssetInfoShape = M.splitRecord({
  base: M.string(),
  name: M.string(),
  display: M.string(),
  symbol: M.string(),
  denom_units: M.arrayOf(
    M.splitRecord({ denom: M.string(), exponent: M.number() }),
  ),
});

/** @type {TypedPattern<CosmosChainInfo>} */
export const CosmosChainInfoShape = M.splitRecord(
  {
    chainId: M.string(),
  },
  {
    connections: M.record(),
    stakingTokens: M.arrayOf({ denom: M.string() }),
    // UNTIL https://github.com/Agoric/agoric-sdk/issues/9326
    icqEnabled: M.boolean(),
  },
);

/** @type {TypedPattern<ChainInfo>} */
export const ChainInfoShape = M.splitRecord({
  chainId: M.string(),
});
export const LocalChainAccountShape = M.remotable('LocalChainAccount');
export const DenomShape = M.string();

/** @type {TypedPattern<DenomInfo<any, any>>} */
export const DenomInfoShape = {
  chain: M.remotable('Chain'),
  base: M.remotable('Chain'),
  brand: M.or(M.remotable('Brand'), M.undefined()),
  baseDenom: M.string(),
};

/** @type {TypedPattern<DenomAmount>} */
export const DenomAmountShape = { denom: DenomShape, value: M.bigint() };

export const AmountArgShape = M.or(AmountShape, DenomAmountShape);

export const ICQMsgShape = M.splitRecord(
  { path: M.string(), data: M.string() },
  { height: M.string(), prove: M.boolean() },
);

/** @type {TypedPattern<TypedJson>} */
export const TypedJsonShape = M.splitRecord({ '@type': M.string() });

/** @see {Chain} */
export const chainFacadeMethods = harden({
  getChainInfo: M.call().returns(VowShape),
  makeAccount: M.call().returns(VowShape),
});

/**
 * for google/protobuf/timestamp.proto, not to be confused with TimestampShape
 * from `@agoric/time`
 */
export const TimestampProtoShape = { seconds: M.nat(), nanos: M.number() };

/** see {@link TxBody} for more details */
export const TxBodyOptsShape = M.splitRecord(
  {},
  {
    memo: M.string(),
    timeoutHeight: M.bigint(),
    extensionOptions: M.arrayOf(M.any()),
    nonCriticalExtensionOptions: M.arrayOf(M.any()),
  },
);
