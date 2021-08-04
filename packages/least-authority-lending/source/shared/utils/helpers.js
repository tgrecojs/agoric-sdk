import {
  assertProposalShape,
  makeRatio,
} from '@agoric/zoe/src/contractSupport/index.js';

const defaultProposal = {
  give: { Liquidity: null },
  want: { LendingPoolToken: null },
};

const createProposal = (proposal = defaultProposal) => seat =>
  assertProposalShape(seat, proposal);

const createLaTokenRatio = (collateralBrand, lariTokenBrand) => amount =>
  makeRatio(amount, collateralBrand, amount, lariTokenBrand);

export { createProposal, defaultProposal, createLaTokenRatio };
