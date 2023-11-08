// @ts-check
/* eslint-disable import/order */
import { countKeys, describe } from '../../prepareRiteway.js'
import { AmountWrapper } from '../../../src/vaultFactory/safeLeverageTokens/amountHelpers.js'
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { stat } from 'fs';

const usdcKit = makeIssuerKit('USDC');
const stAtomKit = makeIssuerKit('ST_ATOM');
const aEthKit = makeIssuerKit('Axeral_ETH')

const usdc = x => AmountMath.make(usdcKit.brand, x);
const aEth = x => AmountMath.make(stAtomKit.brand, x);
const stAtoms = x => AmountMath.make(aEthKit.brand, x);
const NobleUSDC = AmountWrapper.make(usdc(0n));
const [EmptyNoblePurse, EmptyStakedAtomPurse, EmptyAEthPurse] = [usdcKit, stAtomKit, aEthKit].map(({ brand }) => AmountWrapper.of(brand))




const StakedATOM = x => AmountWrapper(stAtoms(x));
const AxelarEth = x => AmountWrapper(aEth(x));


export const TEST_AMOUNT_WRAPPERS = {
    NobleUSDC,
    StakedATOM,
    AxelarEth
}

const testData = [
    10n,
    50n,
    60n,
    10n,
    20n,
    55n,
    240n,
    43n,
    6000n,
    20n,
    40n,
    50n,
    10_000n,
    41n,
    12_050n
];


const createAmountsForType = AmountType => testData.map(AmountType)
const testUsdcAmounts = testData.map(usdc);

/**
 * Description placeholder
 * @date 7/18/2023 - 1:25:11 AM
 *
 * @param {*} x
 * @param {*} y
 * @returns {*}
 */
const adder = (x, y) => x + y;
/**
 * Description placeholder
 * @date 7/18/2023 - 1:25:11 AM
 *
 * @param {*} data
 * @returns {*}
 */
const sum = data => data.reduce(adder, 0n);

const AMOUNT_WRAPPERS = {
    ZeroUSDC: AmountWrapper.of(usdcKit.brand),
    ZeroStAtom: AmountWrapper.of(stAtomKit.brand),
    ZeroAxerlarEth: AmountWrapper.of(aEthKit.brand)
}
const AmountUSDC = x => AmountWrapper(usdc(x));
const AmountStAtom = x => AmountWrapper(stAtoms(x));
const AmountAEth = x => AmountWrapper(aEth(x));


const arrayOfUSDCWrappers = testData.map(AmountUSDC)


describe('empty amount::', assert => {
    const { ZeroUSDC, ZeroStAtom, ZeroAxerlarEth } = AMOUNT_WRAPPERS;

    assert({
        given: 'a brand USDC',
        should: 'create an empty amount',
        actual: ZeroUSDC.value,
        expected: AmountMath.makeEmpty(usdcKit.brand)
    })
    assert({
        given: 'a brand StAtom',
        should: 'create an empty amount',
        actual: ZeroStAtom.value,
        expected: AmountMath.makeEmpty(stAtomKit.brand)
    })

    assert({
        given: 'a brand AEth',
        should: 'create an empty amount',
        actual: ZeroAxerlarEth.value,
        expected: AmountMath.makeEmpty(aEthKit.brand)
    })
})
describe('max :: Amount ', async assert => {
    const ex1 = AmountUSDC(10n);
    const ex2 = AmountUSDC(40n);
    console.log({ ex1 })
    assert({
        given: '2 new Amounts',
        should: 'return the greater of the two',
        actual: ex1.max(ex2).value,
        expected: usdc(40n)
    });

    const [fst, snd] = arrayOfUSDCWrappers;
    assert({
        given: 'the first 2 Amounts from testUsdcAmounts array',
        should: 'return the greater of the two',
        actual: fst.max(snd).value,
        expected: usdc(50n)
    });

    const findMax = arrayOfUSDCWrappers.reduce((acc, val) => acc.max(val));

    assert({
        given: 'a list of Amounts',
        should: 'return the largest amount in the list',
        actual: findMax.value,
        expected: usdc(12_050n)
    });
});

describe('min :: Amount ', async assert => {
    const ex1 = AmountUSDC(10n);
    const ex2 = AmountUSDC(40n);
    console.log({ ex1, min: ex1.min(testUsdcAmounts[3]) })
    assert({
        given: '2 new Amounts',
        should: 'return the smaller of the two',
        actual: ex1.min(ex2).value,
        expected: usdc(10n)
    });
    const [fst, snd] = testUsdcAmounts;

    assert({
        given: 'the first 2 Amounts from testUsdcAmounts array',
        should: 'return the smaller of the two',
        actual: fst.min(snd).value,
        expected: usdc(10n)
    });

    const findMin = testUsdcAmounts.reduce((acc, val) => acc.min(val));

    assert({
        given: 'a list of Amounts',
        should: 'return the largest amount in the list',
        actual: findMin.value,
        expected: usdc(10n)
    });
});

describe('add :: Amount', async assert => {
    assert({
        given: 'two new Amounts',
        should: 'return the sum of both amounts',
        actual: AmountUSDC(10n).add(AmountUSDC(50n)).value,
        expected: usdc(60n)
    });
    const result = testData.reduce(
        (acc, val) => acc.add(AmountUSDC(val)),
        AmountUSDC(0n)
    );

    const sumOfTestInts = sum(testData);

    assert({
        given: 'a list of USDC Amounts',
        should: 'return the sum of all amounts in the list',
        actual: result.value,
        expected: usdc(sumOfTestInts)
    });
});

describe('subtract :: Amount', async assert => {
    assert({
        given: 'two values',
        should: 'return the difference',
        actual: AmountUSDC(100n).subtract(AmountUSDC(25n)).value,
        expected: usdc(75n)
    });
});