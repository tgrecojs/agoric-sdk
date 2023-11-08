import { AmountMath } from '@agoric/ertp';
import { Far } from '@endo/marshal';

const { add, isGTE, max, min, subtract, makeEmpty, make } = AmountMath;
/** @param {Amount} amount */
const AmountWrapper = amount => ({
  get value() {
    return amount;
  },
  get brand() {
    return amount.brand;
  },
  empty() {
    return AmountWrapper(this.value);
  },
  /** @param {AmountWrapper} other */
  add(other) {
    return harden(AmountWrapper(add(this.value, other.value)));
  },
  /** @param {AmountWrapper} other */
  max(other) {
    return harden(AmountWrapper(max(this.value, other.value)));
  },
  /** @param {AmountWrapper} other */
  min(other) {
    return harden(AmountWrapper(min(this.value, other.value)));
  },
  /** @param {AmountWrapper} other */
  subtract(other) {
    return harden(AmountWrapper(subtract(this.value, other.value)));
  },
});

AmountWrapper.of = brand => AmountWrapper(makeEmpty(brand));

AmountWrapper.make = x => AmountWrapper(x);

harden(AmountWrapper);

const AmountRemotable = x => Far('Amount Type', harden(AmountWrapper(x)));

harden(AmountRemotable);

export { AmountWrapper, AmountRemotable };
