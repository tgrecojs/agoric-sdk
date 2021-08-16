const collateralLists = [
  {
    name: 'USDC',
    uOptimal: 85,
    slope1: 4,
    slope2: 75,
  },
  {
    name: 'RUN',
    uOptimal: 80,
    slope1: 4,
    slope2: 60,
  },
  {
    name: 'BLD',
    uOptimal: 45,
    slope1: 4,
    slope2: 300,
  },
  {
    name: 'LINK',
    uOptimal: 45,
    slope1: 7,
    slope2: 300,
  },
];
const getCurrentUtilization = ({ borrowed, deposited }) => borrowed / deposited;

const testPoolData = {
  supplied: 500000,
  borrowed: 10000,
};
const trace = label => val => {
  console.log(`${label}::`, val);
  return val;
};

const convertDecimal = ({ utilization, ...x } = {}) => ({
  ...x,
  utilization: utilization * 100,
});
const compose = (...fns) => initial =>
  fns.reduceRight((val, fn) => fn(val), initial);
compose(
  x => x / 2,
  trace('after * 10'),
  x => x * 10,
  trace('after + 50'),
  x => x + 50,
)(100); // ?
const id = x => x;
const belowUOptimalCalc = ({ utilization, uOptimal, slope1, ...x }) => ({
  ...x,
  interestRate: 0 + (utilization / uOptimal) * slope1,
});

const handleDivide = ({ utilization, uOptimal }) =>
  (utilization - uOptimal) / (1 - uOptimal);

const aboveUoptimalCalc = ({
  utilization,
  uOptimal,
  slope1,
  slope2,
  ...x
}) => ({
  ...x,
  interestRate: 0 + slope1 + handleDivide({ uOptimal, utilization }),
});
const uOptimalGteCheck = ({ uOptimal, ...x }) =>
  uOptimal >= x.utilization
    ? {
        ...x,
        ...belowUOptimalCalc({ uOptimal, ...x }),
      }
    : {
        ...x,
        ...aboveUoptimalCalc({ uOptimal, ...x }),
      };
const calculateRate = compose(
  id,
  x => ({ ...x, interestRate: x.interestRate * 100 }),
  trace('after get current'),
  uOptimalGteCheck,
  trace('after conversion'),
  convertDecimal,
  x => ({ ...x, utilization: getCurrentUtilization(x) }),
);

export { calculateRate, collateralLists };
