import { Either, Fn, FnT } from './types';

const FnEither = FnT(Either);

const trace = label => value => {
  console.log(`${label}::`, value);
  return value;
};
const testPayment = { brand: 'test', amount: 100000n };
const res = p =>
  FnEither.of(p).map(e => {
    return e.brand === 'test' ? e : new Error('error');
  });

trace('res::')(
  res(x => x).fold(
    e => new Error('error', e),
    y => y,
  ),
);
