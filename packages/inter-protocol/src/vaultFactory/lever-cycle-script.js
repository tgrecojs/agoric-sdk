const add = (x, y) => x + y;
const comp = fn => (x, y) => fn(x, y);
const mulp = comp((x, y) => x * y);
const adder = comp(add);

function calculateLeverUpResult(
  initialAtom,
  targetCycles,
  collateralizationRatio,
  liquidationRatio,
  priceOfCollateral,
  priceOfATOM,
) {
  let atomBalance = initialAtom;
  let daiBalance = 0;
  let collateralValue = atomBalance * priceOfATOM;

  for (let i = 0; i < targetCycles; i++) {
    console.log({ i });
    let daiToAdd =
      (collateralValue / collateralizationRatio) * 100 - daiBalance;
    let atomToBuy = daiToAdd / priceOfATOM;
    atomBalance += atomToBuy;
    daiBalance += daiToAdd;
    collateralValue = atomBalance * priceOfATOM;
  }

  let resultingCollateralizationRatio = collateralValue / daiBalance;

  return {
    atomBalance,
    daiBalance,
    resultingCollateralizationRatio,
  };
}
10 + 10; //?
calculateLeverUpResult(1000, 2, 180, 200, 0, 10); //?
