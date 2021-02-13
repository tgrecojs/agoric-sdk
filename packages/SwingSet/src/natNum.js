import { Nat } from '@agoric/nat';

export const ZERO = 0n;
export const ONE = 1n;

export function toStr(num) {
  return `${Nat(num)}`;
}

export function fromStr(str) {
  return Nat(Number(str));
}

export function natNum(num) {
  return Nat(num);
}

export function increment(num) {
  return Nat(num) + ONE;
}

export function decrement(num) {
  return Nat(num) - ONE;
}

export function JSONstringify(x) {
  return JSON.stringify(
    x,
    (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
    // return everything else unchanged
  );
}
