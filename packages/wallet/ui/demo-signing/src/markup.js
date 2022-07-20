import { load } from 'cheerio';
import { IO } from 'monio';

const htmlString = `
<body>
<section>
<h2>Accounts</h2>
<div id="accounts"></div>
</section>
<form>
<label>Chain: <select name="chainId"><option>agorictest-19</option><option>cosmoshub-4</option></select></label>
<label>Amount: <input type="number" name="amount" /></label>
<button type="button" id="sign">Sign Transaction</button>
</form>
<body/>
`
  .toString()
  .split(/\r\n|\r|\n/)
  .join(''); // ?

const $ = load(htmlString);
// .test()
const getText = el => $(el).text(); // ?
const log = (label = 'value::') => IO(ctx => console.log({ ctx, label }));

log($.html());
export { htmlString, $, getText };
