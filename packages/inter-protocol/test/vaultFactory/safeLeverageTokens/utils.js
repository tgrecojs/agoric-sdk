let generateArrayWithMap = (length, mapFunction) =>
[...new Array(length)]
.map((_, index) => mapFunction(index));

const go = (f, seed, acc) => f(seed) ? go(f, f(seed)[1], acc.concat([f(seed)[0]])) : acc;

const unfold = (f, seed) => go(f, seed, []);

const makePrecisionNumber = precisionPoint => (number = 2) => number.toPrecision(precisionPoint);
const toDecimalPlace = makePrecisionNumber(4);

const compose = (...fns) => initialValue => fns.reduceRight((acc, fn) => fn(acc), initialValue);
const range = (start, end) => unfold(s => s > end ? false : [s, s + Math.random()], start)


const createRanges  = (target = 4, result = []) => 
target <= 0 ? result : createRanges(target -= 1, result.concat(range(8.05,12.01)))



const toPrecisionPoint = precision => value => value.toPrecision(precision);
const toSixDecimalPlaces  = toPrecisionPoint(5)
const toNumber = x => Number(x);

const  createPriceData =  (iterations =10) => 
createRanges(iterations)
.map(toSixDecimalPlaces)
.map(toNumber) //?
const sortArray = array => array.sort();


const formatToFourPrecisionPoints = compose(sortArray,createPriceData)
const mapper = fn => array => array.map(fn);

export {
 formatToFourPrecisionPoints as createNATArray,
    createPriceData
}