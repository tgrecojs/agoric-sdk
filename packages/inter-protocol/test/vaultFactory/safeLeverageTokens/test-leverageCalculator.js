import '@agoric/zoe/exported.js';
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { makeTracer } from '@agoric/internal';
import { makeDriverContext } from '../driver.js';
import { invertRatio, multiplyBy } from '@agoric/zoe/src/contractSupport/ratio.js';

const trace = makeTracer('LeverageCalculator')


test.before(async t => {
    t.context = await makeDriverContext();
    trace(t, 'CONTEXT');
});
const createRatio = brand => (collateralizationRatio) => harden(makeRatio(collateralizationRatio, brand))

// 1. calculate total ATOM in IST
// 

const createLeveragedVaultProjection = (
    initialAtom = 0,
    targetCycles = 2,
    collateralizationRatio,
    liquidationRatio,
    priceOfCollateral
) => {
    let atomBalance = initialAtom;
    let daiBalance = 0;
    let collateralValue = atomBalance * priceOfCollateral;

    for (let i = 0; i < targetCycles; i++) {
        const daiToAdd = (collateralValue / collateralizationRatio) * 100 - daiBalance;
        const atomToBuy = daiToAdd / priceOfCollateral;
        atomBalance += atomToBuy;
        daiBalance += daiToAdd;
        collateralValue = atomBalance * priceOfCollateral;
    }

    const resultingCollateralizationRatio = collateralValue / daiBalance;

    return {
        atomBalance,
        daiBalance,
        resultingCollateralizationRatio
    };
}

createLeveragedVaultProjection(1000, 2, 180, 200, 10) //?

test('leveraged account calculator', async t => {
  const { aeth, ...rest } = t.context;
    const aethRatio = makeRatio(200n, aeth.brand, 100n, aeth.brand);

    console.log({rest})
    // 1000N 
    t.deepEqual(multiplyBy(aeth.make(1000n), invertRatio(aethRatio)), aeth.make(500n),'should return the correct output.')

    t.deepEqual(multiplyBy(aeth.make(1000n), makeRatio(220n, aeth.brand)))

})