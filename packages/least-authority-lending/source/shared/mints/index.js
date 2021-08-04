// @ts-check

/* global __dirname */

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import { makeIssuerKit, AssetKind, AmountMath } from '@agoric/ertp';
import { Far } from '@agoric/marshal';

import bundleSource from '@agoric/bundle-source';
import { E } from '@agoric/eventual-send';

const collateralTypes = ['LINK', 'USDC', 'BLD', 'RUN'];

const makeLendingTokenKit = x => makeIssuerKit(`la${x}`, AssetKind.NAT);
const natKit = x => makeIssuerKit(x, AssetKind.NAT);
const createIssuerKits = kitType => (tokens = collateralTypes) =>
  tokens.map(kitType);
const createTokenKit = createIssuerKits(natKit);
const createLendingTokenKits = createIssuerKits(makeLendingTokenKit);
export { createTokenKit, createLendingTokenKits, collateralTypes };
