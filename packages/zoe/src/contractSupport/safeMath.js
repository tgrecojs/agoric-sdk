import { Nat } from '@agoric/nat';

/**
 * These operations should be used for calculations with the
 * values of basic fungible tokens.
 */
export const natSafeMath = harden({
  add: (x, y) => Nat(Nat(x) + Nat(y)),
  subtract: (x, y) => Nat(Nat(x) - Nat(y)),
  multiply: (x, y) => Nat(Nat(x) * Nat(y)),
  floorDivide: (x, y) => Nat(Nat(x) / Nat(y)),
  // ceilDivide: (x, y) => Nat(Math.ceil(Nat(x) / Nat(y))),
  isGTE: (x, y) => x >= y,
});
