import tape from 'tape';

const noop = () => {};
const riteway =
  testFramework =>
  ({
    componentName = 'default fn',
    given = 'default arguments',
    should = 'return the default input',
    actual = noop,
    expected = noop,
  }) =>
    testFramework(componentName, async t => {
      t.deepEquals(actual, expected, given.concat(` ${should}`));
      await 'done';
    });
const setupTape = riteway(tape);

export { riteway, setupTape };
