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

const testFn = ({ getRatio }) => getRatio;

const getNat = o => handleParamNameFn(o)('getNat');
const getRatio = o => handleParamNameFn(o)('getRatio');
const getNatParamState = paramDesc => getNatFn(paramDesc);
const getRatioParamState = paramDesc => getRatioFn(paramDesc);

const getParams = x => x.getParams();

const lookupProp = map => key => map.get(key);

const COLLATERAL_BRAND = 'collateralBrand';
const getCurrentSeatAllocation = seat => seat.getCurrentAllocation();

const lookupCollateralFns = map => compose(lookupProp(map));
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
};
