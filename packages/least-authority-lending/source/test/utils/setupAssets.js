import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import makeStore from '@agoric/store';
import fakeVatAdmin, { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin';

import { makeZoe } from '@agoric/zoe';

const setup = () => {
  const linkBundle = makeIssuerKit('link');
  const laLinkBundle = makeIssuerKit('laLink');
  const laRunBundle = makeIssuerKit('laRun');
  const laBldBundle = makeIssuerKit('laBld');
  const laUsdcBundle = makeIssuerKit('laUsdc');

  const runBundle = makeIssuerKit('run');
  const bldBundle = makeIssuerKit('bld');
  const allBundles = {
    laLink: laLinkBundle,
    laRun: laRunBundle,
    laBld: laBldBundle,
    link: linkBundle,
    run: runBundle,
    bld: bldBundle,
  };
  /** @type {Store<string, Brand>} */
  const brands = makeStore('brandName');

  for (const k of Object.getOwnPropertyNames(allBundles)) {
    brands.init(k, allBundles[k].brand);
  }

  const zoe = makeZoe(fakeVatAdmin);

  const makeSimpleMake = brand => value => AmountMath.make(value, brand);

  /**
   * @typedef {Object} BasicMints
   * @property {Issuer} linkIssuer
   * @property {Mint} linkMint
   * @property {IssuerKit} linkR
   * @property {IssuerKit} linkKit
   * @property {Issuer} laLinkIssuer
   * @property {Mint} laLinkMint
   * @property {IssuerKit} laLinkR
   * @property {IssuerKit} laLinkKit
   * @property {Issuer} laBldIssuer
   * @property {Mint} laBldMint
   * @property {IssuerKit} laBldR
   * @property {IssuerKit} laBldKit
   * @property {Issuer} laRunIssuer
   * @property {Mint} laRunMint
   * @property {IssuerKit} laRunR
   * @property {IssuerKit} laRunKit
   * @property {Issuer} laUsdcIssuer
   * @property {Mint} laUsdcMint
   * @property {IssuerKit} laUsdcKit
   * @property {Issuer} runIssuer
   * @property {Mint} runMint
   * @property {IssuerKit} runR
   * @property {IssuerKit} runKit
   * @property {Issuer} bldIssuer
   * @property {Mint} bldMint
   * @property {IssuerKit} bldR
   * @property {IssuerKit} bldKit
   * @property {Store<string, Brand>} brands
   * @property {(value: any) => Amount} laLink
   * @property {(value: any) => Amount} laRun
   * @property {(value: any) => Amount} laBld
   * @property {ZoeService} zoe
   */

  /** @type {BasicMints} */
  const result = {
    laUsdcIssuer: laUsdcBundle.issuer,
    laUsdcMint: laUsdcBundle.mint,
    laUsdcKit: laUsdcBundle,
    linkIssuer: linkBundle.issuer,
    linkMint: linkBundle.mint,
    linkR: linkBundle,
    linkKit: linkBundle,
    laLinkIssuer: laLinkBundle.issuer,
    laLinkMint: laLinkBundle.mint,
    laLinkBrand: laLinkBundle.brand,
    laLinkR: laLinkBundle,
    laLinkKit: laLinkBundle,
    laRunIssuer: laRunBundle.issuer,
    laRunMint: laRunBundle.mint,
    laRunR: laRunBundle,
    laRunKit: laRunBundle,
    laBldIssuer: laBldBundle.issuer,
    laBldMint: laBldBundle.mint,
    laBldR: laBldBundle,
    laBldKit: laBldBundle,
    runIssuer: runBundle.issuer,
    runMint: runBundle.mint,
    runR: runBundle,
    runKit: runBundle,
    bldIssuer: bldBundle.issuer,
    bldMint: bldBundle.mint,
    bldR: bldBundle,
    bldKit: bldBundle,
    brands,
    link: makeSimpleMake(linkBundle.brand),
    run: makeSimpleMake(runBundle.brand),
    bld: makeSimpleMake(bldBundle.brand),
    laLink: makeSimpleMake(laLinkBundle.brand),
    laBld: makeSimpleMake(laBldBundle.brand),
    laRun: makeSimpleMake(laRunBundle.brand),
    zoe,
  };
  harden(result);
  return result;
};
harden(setup);
export { setup };
