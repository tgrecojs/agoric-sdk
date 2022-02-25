// @ts-check

import '@agoric/zoe/exported.js';
import '@agoric/zoe/src/contracts/exported.js';

// The vaultFactory owns a number of VaultManagers and a mint for RUN.
//
// addVaultType is a closely held method that adds a brand new collateral type.
// It specifies the initial exchange rate for that type. It depends on a
// separately specified AMM to provide the ability to liquidate loans that are
// in arrears. We could check that the AMM has sufficient liquidity, but for the
// moment leave that to those participating in the governance process for adding
// new collateral type to ascertain.

// This contract wants to be managed by a contractGovernor, but it isn't
// compatible with contractGovernor, since it has a separate paramManager for
// each Vault. This requires it to manually replicate the API of contractHelper
// to satisfy contractGovernor. It needs to return a creatorFacet with
// { getParamMgrRetriever, getInvitation, getLimitedCreatorFacet }.

import { E } from '@agoric/eventual-send';
import '@agoric/governance/src/exported';

import { makeScalarMap, keyEQ } from '@agoric/store';
import {
  assertProposalShape,
  getAmountOut,
  getAmountIn,
} from '@agoric/zoe/src/contractSupport/index.js';
import { makeRatioFromAmounts } from '@agoric/zoe/src/contractSupport/ratio.js';
import { AmountMath } from '@agoric/ertp';
import { Far } from '@endo/marshal';
import { CONTRACT_ELECTORATE } from '@agoric/governance';

import { makeVaultManager } from './vaultManager.js';
import { makeLiquidationStrategy } from './liquidateMinimum.js';
import { makeMakeCollectFeesInvitation } from './collectRewardFees.js';
import { makeVaultParamManager, makeElectorateParamManager } from './params.js';
import { Either, Endo, FnT, Reader, Task, TaskT } from '../utils/types.js';

const { details: X } = assert;

const compose =
  (...fns) =>
  initial =>
    fns.reduceRight((acc, fn) => fn(acc), initial);
const pipe =
  (...fns) =>
  initial =>
    fns.reduce((acc, fn) => fn(acc), initial);

const handleParamNameFn =
  ({ parameterName }) =>
  fn =>
    fn(parameterName);

const getNat = o => handleParamNameFn(o)('getNat');
const getRatio = o => handleParamNameFn(o)('getRatio');
const getNatParamState = paramDesc => getNat(paramDesc);
const getRatioParamState = paramDesc => getRatio(paramDesc);
const getParams = x => x.getParams();
const lookupProp = map => key => map.get(key);
const COLLATERAL_BRAND = 'collateralBrand';
const getCurrentSeatAllocation = seat => seat.getCurrentAllocation();
const lookupCollateralFns = map => compose(lookupProp(map));

/** @type {ContractStartFn} */
export const start = async (zcf, privateArgs) => {
  const {
    ammPublicFacet,
    priceAuthority,
    timerService,
    liquidationInstall,
    bootstrapPaymentValue = 0n,
    electionManager,
    main: { [CONTRACT_ELECTORATE]: electorateParam },
    loanTimingParams,
  } = zcf.getTerms();

  const StartM = Reader.of(zcf.getTerms());
  console.log({ StartM });

  /** @type {Promise<GovernorPublic>} */
  const governorPublic = E(zcf.getZoeService()).getPublicFacet(electionManager);

  const { feeMintAccess, initialPoserInvitation } = privateArgs;
  const runMint = await zcf.registerFeeMint('RUN', feeMintAccess);
  const { issuer: runIssuer, brand: runBrand } = runMint.getIssuerRecord();
  zcf.setTestJig(() => ({
    runIssuerRecord: runMint.getIssuerRecord(),
  }));

  /** a powerful object; can modify the invitation */
  const electorateParamManager = await makeElectorateParamManager(
    zcf.getZoeService(),
    initialPoserInvitation,
  );

  const electorateInvAmt =
    electorateParamManager.getInvitationAmount(CONTRACT_ELECTORATE);
  assert(
    keyEQ(electorateInvAmt, electorateParam.value),
    X`electorate amount (${electorateParam.value} didn't match ${electorateInvAmt}`,
  );

  const { zcfSeat: rewardPoolSeat } = zcf.makeEmptySeatKit();

  /**
   * We provide an easy way for the vaultManager to add rewards to
   * the rewardPoolSeat, without directly exposing the rewardPoolSeat to them.
   *
   * @type {ReallocateReward}
   */
  const reallocateReward = (amount, fromSeat, otherSeat = undefined) => {
    rewardPoolSeat.incrementBy(
      fromSeat.decrementBy(
        harden({
          RUN: amount,
        }),
      ),
    );
    if (otherSeat !== undefined) {
      zcf.reallocate(rewardPoolSeat, fromSeat, otherSeat);
    } else {
      zcf.reallocate(rewardPoolSeat, fromSeat);
    }
  };

  /** @type {Store<Brand,VaultManager>} */
  const collateralTypes = makeScalarMap('brand');

  const zoe = zcf.getZoeService();

  /** @type { Store<Brand, VaultParamManager> } */
  const vaultParamManagers = makeScalarMap('brand');
  const getCollateralBrandFromMap = o =>
    lookupCollateralFns(vaultParamManagers)(o[COLLATERAL_BRAND]);

  const getGovernedParams = compose(getParams, getCollateralBrandFromMap);

  /** @type {AddVaultType} */
  const addVaultType = async (collateralIssuer, collateralKeyword, rates) => {
    await zcf.saveIssuer(collateralIssuer, collateralKeyword);
    const collateralBrand = zcf.getBrandForIssuer(collateralIssuer);
    // We create only one vault per collateralType.
    assert(
      !collateralTypes.has(collateralBrand),
      `Collateral brand ${collateralBrand} has already been added`,
    );

    /** a powerful object; can modify parameters */
    const vaultParamManager = makeVaultParamManager(rates);
    vaultParamManagers.init(collateralBrand, vaultParamManager);

    const { creatorFacet: liquidationFacet } = await E(zoe).startInstance(
      liquidationInstall,
      harden({ RUN: runIssuer, Collateral: collateralIssuer }),
      harden({ amm: ammPublicFacet }),
    );
    const liquidationStrategy = makeLiquidationStrategy(liquidationFacet);

    const vm = makeVaultManager(
      zcf,
      runMint,
      collateralBrand,
      priceAuthority,
      loanTimingParams,
      vaultParamManager.getParams,
      reallocateReward,
      timerService,
      liquidationStrategy,
    );
    collateralTypes.init(collateralBrand, vm);
    return vm;
  };

  /** Make a loan in the vaultManager based on the collateral type. */
  const makeLoanInvitation = () => {
    console.log({ StartM, runIt: StartM.run(x => x) });
    /** @param {ZCFSeat} seat */
    const makeLoanHook = async seat => {
      assertProposalShape(seat, {
        give: { Collateral: null },
        want: { RUN: null },
      });
      const {
        give: { Collateral: collateralAmount },
      } = seat.getProposal();
      const { brand: brandIn } = collateralAmount;
      assert(
        collateralTypes.has(brandIn),
        X`Not a supported collateral type ${brandIn}`,
      );
      /** @type {VaultManager} */
      const mgr = collateralTypes.get(brandIn);
      return mgr.makeLoanKit(seat);
    };

    return zcf.makeInvitation(makeLoanHook, 'MakeLoan');
  };

  const getCollaterals = async () => {
    // should be collateralTypes.map((vm, brand) => ({
    return harden(
      Promise.all(
        [...collateralTypes.entries()].map(async ([brand, vm]) => {
          const priceQuote = await vm.getCollateralQuote();
          return {
            brand,
            interestRate: vm.getInterestRate(),
            liquidationMargin: vm.getLiquidationMargin(),
            initialMargin: vm.getInitialMargin(),
            stabilityFee: vm.getLoanFee(),
            marketPrice: makeRatioFromAmounts(
              getAmountOut(priceQuote),
              getAmountIn(priceQuote),
            ),
          };
        }),
      ),
    );
  };

  // TODO(#4021) remove this method
  const mintBootstrapPayment = () => {
    const { zcfSeat: bootstrapZCFSeat, userSeat: bootstrapUserSeat } =
      zcf.makeEmptySeatKit();
    const bootstrapAmount = AmountMath.make(runBrand, bootstrapPaymentValue);
    runMint.mintGains(
      harden({
        Bootstrap: bootstrapAmount,
      }),
      bootstrapZCFSeat,
    );
    bootstrapZCFSeat.exit();
    const bootstrapPayment = E(bootstrapUserSeat).getPayout('Bootstrap');

    const paymentReader = amt =>
      Reader(amt).map(Endo).concat(Reader(bootstrapPayment));
    const BootstrapState = paymentReader(bootstrapPayment);
    /**
     * @param {Amount=} expectedAmount - if provided, assert that the bootstrap
     * payment is at least the expected amount
     */

    const setPayment = payload => state =>
      payload.prefs ? { ...state, payment: payload.payment } : state;

    const validateAmount = (
      actualAmount,
      expectedAmount,
      text = `${bootstrapAmount} is not at least ${expectedAmount}`,
    ) => assert(AmountMath.isGTE(actualAmount, bootstrapAmount), X`${text}`);
    const contractState = { user: bootstrapUserSeat, amount: bootstrapAmount };
    const validatePayment = payload => state =>
      payload.email
        ? {
            ...state,
            bootstrapPayment: validateAmount(state.amount, payload.expected),
          }
        : state;
    const FnEither = FnT(Either);

    const reducer = Reader(validatePayment)
      .map(Endo)
      .concat(Reader(setPayment).map(Endo));
    const TaskEither = TaskT(Either);
    const App = FnT(TaskEither);

    const Fn = Reader;
    const reducerM = Fn(validateAmount)
      .map(Endo)
      .concat(Fn(setPayment).map(Endo));

    const paymentR = Reader(validatePayment)
      .map(Endo)
      .concat(Reader(setPayment).map(Endo));
    const getBootstrapPayment = expectedAmount => {
      const safeGetBootstrap = FnT(Either);
      const safeB = safeGetBootstrap(expectedAmount);

      console.log({ safeGetBootstrap, safeB, bootstrapAmount });
      if (expectedAmount) {
        console.log({ safeGetBootstrap, bootstrapAmount, expectedAmount });
        assert(
          AmountMath.isGTE(bootstrapAmount, expectedAmount),
          X`${bootstrapAmount} is not at least ${expectedAmount}`,
        );
      }
      return bootstrapPayment;
    };
    return getBootstrapPayment;
  };

  /** @type {VaultFactoryPublicFacet} */
  const publicFacet = Far('vaultFactory public facet', {
    makeLoanInvitation,
    getCollaterals,
    getRunIssuer: () => runIssuer,
    getNatParamState,
    getRatioParamState,
    getGovernedParams,
    getContractGovernor: () => governorPublic,
    getInvitationAmount: electorateParamManager.getInvitationAmount,
  });

  const { makeCollectFeesInvitation } = makeMakeCollectFeesInvitation(
    zcf,
    rewardPoolSeat,
    runBrand,
  );

  const getParamMgrRetriever = () =>
    Far('paramManagerRetriever', {
      get: paramDesc =>
        paramDesc.key === 'main'
          ? electorateParamManager
          : vaultParamManagers.get(paramDesc.collateralBrand),
    });

  /** @type {VaultFactory} */
  const vaultFactory = Far('vaultFactory machine', {
    addVaultType,
    getCollaterals,
    getRewardAllocation: () => getCurrentSeatAllocation(rewardPoolSeat),
    getBootstrapPayment: mintBootstrapPayment(),
    makeCollectFeesInvitation,
    getContractGovernor: () => electionManager,
  });

  const vaultFactoryWrapper = Far('powerful vaultFactory wrapper', {
    getParamMgrRetriever,
    getInvitation: electorateParamManager.getInternalParamValue,
    getLimitedCreatorFacet: () => vaultFactory,
  });

  return harden({
    creatorFacet: vaultFactoryWrapper,
    publicFacet,
  });
};
