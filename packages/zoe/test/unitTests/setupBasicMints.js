import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import { makeScalarMapStore } from '@agoric/store';
import { makeZoeForTest } from '../../tools/setup-zoe.js';
import { makeFakeVatAdmin } from '../../tools/fakeVatAdmin.js';

export const setup = () => {
  const memeKit = makeIssuerKit('memes');

  const moolaKit = makeIssuerKit('moola');
  const simoleanKit = makeIssuerKit('simoleans');
  const bucksKit = makeIssuerKit('bucks');
  const allIssuerKits = {
    memes: memeKit,
    moola: moolaKit,
    simoleans: simoleanKit,
    bucks: bucksKit,
  };
  /** @type {MapStore<string, Brand<'nat'>>} */
  const brands = makeScalarMapStore('brandName');

  for (const k of Object.getOwnPropertyNames(allIssuerKits)) {
    brands.init(k, allIssuerKits[k].brand);
  }

  const { admin: fakeVatAdmin, vatAdminState } = makeFakeVatAdmin();
  const zoe = makeZoeForTest(fakeVatAdmin);

  /** @type {<K extends AssetKind>(brand: Brand<K>) => (value: any) => Amount<K>} */
  const makeSimpleMake = brand => value => AmountMath.make(brand, value);

  const result = {
    memeIssuer: memeKit.issuer,
    memeMint: memeKit.mint,
    memeKit,
    moolaIssuer: moolaKit.issuer,
    moolaMint: moolaKit.mint,
    moolaKit,
    simoleanIssuer: simoleanKit.issuer,
    simoleanMint: simoleanKit.mint,
    simoleanKit,
    bucksIssuer: bucksKit.issuer,
    bucksMint: bucksKit.mint,
    bucksKit,
    brands,
    memes: makeSimpleMake(memeKit.brand),
    moola: makeSimpleMake(moolaKit.brand),
    simoleans: makeSimpleMake(simoleanKit.brand),
    bucks: makeSimpleMake(bucksKit.brand),
    zoe,
    vatAdminState,
  };
  harden(result);
  return result;
};
harden(setup);
