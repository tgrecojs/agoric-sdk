import { Either, IO } from 'monio';
// identity::x -> x
const id = x => x;
// genArray::number, fn -> array
const genArray = (length, fn = id, start = length) =>
  Array.from({ length }, (_, i) => fn(length * start * i));

const deepEqualityCheck = (expected, actual) =>
  IO.of(() => actual.constructor === expected);

const safeCheckEquality = target => type =>
  IO.of(() => deepEqualityCheck(type)(target));
deepEqualityCheck;
const makeEmptyArray = () => [];
const head = ([a] = []) => a;
const tail = arr => arr[arr.length - 1];
const curry = fn => x => y => fn(x, y);
const flip = ([x, y]) => [y, x];

const validateButtonElement = x => safeCheckEquality(HTMLButtonElement)(x);
const validateInputElement = x => safeCheckEquality(HTMLInputElement)(x);
const validateSelectElement = x => safeCheckEquality(HTMLSelectElement)(x);
const { Left, Right } = Either;

export {
  genArray,
  id,
  head,
  tail,
  curry,
  flip,
  deepEqualityCheck,
  validateButtonElement,
  safeCheckEquality,
  validateInputElement,
  validateSelectElement,
};
