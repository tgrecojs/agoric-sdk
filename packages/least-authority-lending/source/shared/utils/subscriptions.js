import Either from 'crocks/Either';
import * as M from 'monio';
import Maybe from 'crocks/Maybe';
import Async from 'crocks/Async';

import safeLift from 'crocks/Maybe/safeLift';

import eitherToMaybe from 'crocks/Maybe/eitherToMaybe';
import maybeToAsync from 'crocks/Async/maybeToAsync';

import compose from 'crocks/helpers/compose';
import isNumber from 'crocks/predicates/isNumber';
// ?
const { IO } = M;

const ask = IO(v => v);
const log = msg => IO(() => console.log(msg));

const c = (x = {}) =>
  IO.do(function* run() {
    const { y } = yield x;
    return y;
  });

async function* listen() {
  const { msg } = yield ask;
  for await (const x of msg) {
    yield IO.do(c(x));
  }
}
function* readNotification(env) {
  return { ...env, obj: yield c(env) };
} // ?

IO.do(readNotification) // ?
  .chain(env => IO.do(listen).run(env)) // ?
  .run({
    msg: [
      { msg: 'hi 2', value: 200 },
      { msg: 'hi', value: 100 },
    ],
  }) // ?
  .catch(err => console.log(err.toStrineg())); // ?

// ?
// ? Avoid nesting
// ? inc :: a -> Maybe Number
const inc = safeLift(isNumber, x => x + 1);

// ? using Function signature
// ? asyncInc :: a -> Async Number Number
const asyncInc = maybeToAsync(0, inc);

// ? using ADT signature to compose (extending functions)
// ? asyncInc :: a -> Async Number Number
const anotherInc = compose(maybeToAsync(0), inc);

// ? resolveValue :: a -> Async _ a
const resolveValue = Async.Resolved;

resolveValue(3) // ? Resolved 3
  .chain(asyncInc) // ? Resolved 4
  .chain(anotherInc) // ? Resolved 5
  .chain(compose(maybeToAsync(20), inc)); // ? Resolved 6

resolveValue('oops') // ? Resolved 'oops'
  .chain(asyncInc) // ? Rejected 0
  .chain(anotherInc) // ? Rejected 0
  .chain(compose(maybeToAsync(20), inc)); // ? Rejected 0

// ? Squash existing nesting
// ? Just Right 'nice'
const good = Maybe.of(Either.Right('nice'));

// ? Just Left 'not so nice'
const bad = Maybe.of(Either.Left('not so nice'));

good.chain(eitherToMaybe); // ? Just 'nice'

bad.chain(eitherToMaybe); // ?

// Nothing

const print = x => {
  console.log(x);
  return x;
};
// log :: String -> a -> a
const logger = label => x => (console.log(`${label}:`, x), x);
const readMsgs = (x = '') => (x && x !== '' ? x : 'finished');

const consume = async subscription =>
  resolveValue(subscription)
    .toPromise()
    .then(x => Maybe.of(x))
    .catch(logger('error'));

//   maybeToAsync('Error within consume iterable', Maybe.Just(subscription))
//   .fork(
//     log('err'),
//     x => readMsgs(x)
//     ) //?
// ?
const someObj = {
  *[Symbol.iterator]() {
    let x = 10;
    x -= 1;
    yield x;
  },
};

const msgs = [
  { msg: 'increase in lending pool liquidity.', value: 1000 },
  { msg: 'increase in lending pool liquidity.', value: 2000 },
  { msg: 'decrease in lending pool liquidity.', value: 500 },
];
const x = [1, 2, 3, 5, 6, 7, 8, 9, 10, 11, 12];
let msgList = [];

setInterval(
  () => (msgList = msgs.length >= 0 ? [].concat(...msgList, msgs.pop()) : []),
  5000,
);
consume(msgs);
