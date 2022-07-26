import test from 'tape';
import { Either, IO, IOx, Maybe } from 'monio';
import { setupTape as riteway } from '../../test/utils.js';
import { $ } from '../../markup.js';

const id = x => x;
const { Left, Right } = Either;
const safeHasKeplr = window =>
  window && window.keplr
    ? Either.Right(window.keplr)
    : Either.Left('Please install keplr wallet extension.');

// const safeMakeUI = IO(env => )
const handleError =
  err =>
  (uiMessage = '') => ({
    error: err,
    uiMessage: uiMessage.length > 1 ? uiMessage : err,
  });

const checkWindow = () => typeof window !== "undefined" && document;
const handleSuccess = id;
console.log('markup', $.html());

test('safeHasKeplr:: window undefined', async t => {
  const actual = safeHasKeplr().fold(
    handleError('browser does not have keplr'),
    id,
  );
  t.true(actual.error, 'should return an object with an error property');
  t.true(actual.uiMessage, 'should return an object with an error property');

  await 'done';
});

const safeWindow = () => IO((env) => {
  console.log({env})
  return env.window
})

test('safeHasKeplr:: window is defined', async t => {
  const actual = safeWindow()
  const testWindow = {
    keplr: {
      connectToWallet:() => ({})
    },
    document: {
      onChange: () => ({})
    }
  }
  t.deepEquals(actual._inspect(),actual.run(testWindow), 'should return a left');
  await 'done';
});
const TEST_CONSTANTS = {
  GET_RANDOM_DOG_API: 'https://dog.ceo/api/breeds/image/random',
};

const safeResponse = response => Maybe.from(response);
const getData = url => IO(() => fetch(url).then(r => r.json()));
const renderMessage = msg => IO(() => (document.body.innerText = msg));

// // `IO.do(..)` accepts a generator to express "do-style"
// // IO chains
// IO.do(function* main({}) {
//   // `yield` of an IO instance (like `await` with
//   // promises in an `async..await` function) will
//   // chain/unwrap the IO, asynchronously if neccessary
//   const resp = yield getData('/some/data');

//   yield renderMessage(resp.msg);

//   // ..
// });
