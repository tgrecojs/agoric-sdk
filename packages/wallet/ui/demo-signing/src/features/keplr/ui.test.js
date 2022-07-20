import test from 'tape';
import { load } from 'cheerio';
import { htmlString, $ } from '../../markup';

const markup = htmlString;

test('ui components', async assert => {
  const act1 = $(markup).html();
  assert.deepEqual(act1, $('body').html(), 'hu');
  await 'done';
});
