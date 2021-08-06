import {
  assertProposalShape,
  makeRatio,
} from '@agoric/zoe/src/contractSupport/index.js';

const defaultPoolConfig = {
  brandName: 'Default',
  zcfSeats: {},
  keywords: harden({
    give: { PoolToken: null },
    want: { Liquidity: null },
  }),
  rates: {
    stableBorrow: 8,
    variableBorrow: 15,
    lendRate: 3,
  },
};

const createPoolConfig = (obj = defaultPoolConfig) => ({
  ...defaultPoolConfig,
  ...obj,
});

const defaultDepositShape = {
  give: { Liquidity: null },
  want: { PoolToken: null },
};

const createProposalAssertion = (proposal = { give: {}, want: {} }) => seat =>
  assertProposalShape(seat, proposal);

const createLaTokenRatio = (collateralBrand, lariTokenBrand) => amount =>
  makeRatio(amount, collateralBrand, amount, lariTokenBrand);

const depositAssertion = createProposalAssertion(defaultDepositShape);
export { depositAssertion, createPoolConfig, createLaTokenRatio };
