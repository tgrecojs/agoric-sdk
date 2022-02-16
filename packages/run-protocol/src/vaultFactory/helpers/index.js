const compose =
  (...fns) =>
  initial =>
    fns.reduceRight((acc, fn) => fn(acc), initial);

const pipe =
  (...fns) =>
  initial =>
    fns.reduce((acc, fn) => fn(acc), initial);

const handleParamNameFn =
  ({ parameterName }) =>
  fn =>
    fn(parameterName);

const getNat = o => handleParamNameFn(o)('getNat');
const getRatio = o => handleParamNameFn(o)('getRatio');
const getNatParamState = paramDesc => getNat(paramDesc);
const getRatioParamState = paramDesc => getRatio(paramDesc);

const getParams = x => x.getParams();

const lookupProp = map => key => map.get(key);

const COLLATERAL_BRAND = 'collateralBrand';
const getCurrentSeatAllocation = seat => seat.getCurrentAllocation();

const lookupCollateralFns = map => compose(lookupProp(map));

const view = (lens, store) => lens.view(store);
const set = (lens, value, store) => lens.set(value, store);

// A function which takes a prop, and returns naive // lens accessors for that prop.

const lensProp = prop => ({
  view: store => store[prop],
  // This is very naive, because it only works for objects:
  set: (value, store) => ({ ...store, [prop]: value }),
});

const giveLens = lensProp('give');
const collateralLens = lensProp('Collateral');
const trace = label => value => {
  console.log(`${label}::`, value);
  return value;
};
const viewGive = ({ getProposal }) => view(giveLens, getProposal());

const handleAssert = assertFn => typeof assertFn() === 'undefinied';

export {
  COLLATERAL_BRAND,
  compose,
  getCurrentSeatAllocation,
  pipe,
  handleParamNameFn,
  getNat,
  getRatio,
  getNatParamState,
  getRatioParamState,
  lookupProp,
  lookupCollateralFns,
  getParams,
  viewGive,
  handleAssert,
};
