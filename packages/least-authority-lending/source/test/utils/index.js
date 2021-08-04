import { AssetKind, makeIssuerKit } from '@agoric/ertp';
import { makeTracer } from './tracer';

const testCollateralTypes = ['LINK', 'USDC', 'BLD', 'RUN'];

const trace = makeTracer('TestUtils::');
const fungibleKit = token => makeIssuerKit(token, AssetKind.NAT);
const createIssuerKitsFromArray = (array = []) => array.map(fungibleKit);

const setupCollateralKits = (brands = testCollateralTypes) => {
  // setup collateral assets
  trace('setup setupCollateralKits');
  return harden({
    ...createIssuerKitsFromArray(brands),
  });
};

export { setupCollateralKits, testCollateralTypes };
