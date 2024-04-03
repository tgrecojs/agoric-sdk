import { M } from '@endo/patterns';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { AmountMath } from '@agoric/ertp';

const head = ([x] = []) => x;
const tail = ([_, ...xs]) => xs;

const compose =
  (...fns) =>
  initialValue =>
    fns.reduceRight((acc, val) => val(acc), initialValue);

const getProp = prop => obj => obj[prop];
const getWindowLength = compose(getProp('windowLength'), head);

/**
 * @typedef {object} EpochDetails
 * @property {bigint} windowLength Length of epoch in seconds. This value is used by the contract's timerService to schedule a wake up that will fire once all of the seconds in an epoch have elapsed
 * @property {bigint} tokenQuantity The total number of tokens recieved by each user who claims during a particular epoch.
 * @property {bigint} index The index of a particular epoch.
 * @property {number} inDays Length of epoch formatted in total number of days
 */

const startupAssertion = (arg, keyName) =>
  assert(
    arg,
    `Contract has been started without required property: ${keyName}.`,
  );

const makeWaker = (name, func) => {
  return Far(name, {
    wake: timestamp => func(timestamp),
  });
};

const createWakeup = async (timer, wakeUpTime, timeWaker, cancelTokenMaker) => {
  const cancelToken = cancelTokenMaker();
  await E(timer).setWakeup(wakeUpTime, timeWaker, cancelToken);
};
const makeCancelTokenMaker = name => {
  let tokenCount = 1;

  return () => Far(`cancelToken-${name}-${(tokenCount += 1)}`, {});
};

const makeAmount = brand => x => AmountMath.make(brand, x);

/**
 * @param {ZCF} zcf
 * @param {{ purse: Purse, timer: import('@agoric/swingset-vat/tools/manual-timer.js').TimerService,}} privateArgs
 * @param {import('@agoric/vat-data').Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const zone = makeDurableZone(baggage, 'rootZone');
  const {
    AirdropUtils,
    startTime,
    brands: { Token: tokenBrand },
  } = zcf.getTerms();

  const createAmount = x => AmountMath.make(tokenBrand, x);

  assert(startTime > 0n, 'startTime must be a BigInt larger than 0n.');
  const claimedAccountsStore = zone.setStore('claimed users', {
    durable: true,
  });
  const [{ stateMachine, states }, distributionSchedule, verify] =
    await Promise.all([
      E(AirdropUtils).getStateMachine(),
      E(AirdropUtils).getSchedule(),
      E(AirdropUtils).getVerificationFn(),
    ]);

  const cancelTokenMaker = makeCancelTokenMaker('airdrop-campaign');
  await stateMachine.transitionTo(states.PREPARED);
  console.log({ stateMachine, states });
  const { purse: airdropPurse, timer } = privateArgs;
  startupAssertion(airdropPurse, 'privateArgs.purse');
  startupAssertion(timer, 'privateArgs.timer');

  console.log('ZONE API::::', { zone });
  const makeUnderlyingAirdropKit = zone.exoClassKit(
    'Airdrop Campaign',
    {
      helper: M.interface('Helper', {
        makeAmountForClaimer: M.call().returns(M.any()),
        cancelTimer: M.call().returns(M.promise()),
        getDistributionEpochDetails: M.call().returns(M.record()),
        updateDistributionMultiplier: M.call().returns(M.promise()),
        updateEpochDetails: M.call().returns(),
      }),
      creator: M.interface('Creator', {
        createPayment: M.call().returns(M.any()),
        prepareAirdropCampaign: M.call().returns(M.promise()),
      }),
      claimer: M.interface('Claimer', {
        claim: M.call().returns(M.promise()),
        view: M.call().returns(M.bigint()),
        getStatus: M.call().returns(M.string()),
      }),
    },
    /**
     * @param {Purse} tokenPurse
     * @param {Array} schedule
     * @param stateMachine
     * @param dsm
     * @param store
     */
    (tokenPurse, schedule, dsm, store) => ({
      currentCancelToken: cancelTokenMaker(),
      currentEpoch: 0,
      distributionSchedule: schedule,
      tokenQuantity: schedule[0].tokenQuantity,
      internalPurse: tokenPurse,
      claimedAccounts: store,
      dsm: Far('state machine', {
        getStatus() {
          return dsm.getStatus();
        },
        transitionTo(state) {
          return dsm.transitionTo(state);
        },
      }),
    }),
    {
      helper: {
        makeAmountForClaimer() {
          const { currentEpoch, distributionSchedule } = this.state;

          return createAmount(distributionSchedule[currentEpoch].tokenQuantity);
        },
        async cancelTimer() {
          await E(timer).cancel(this.state.currentCancelToken);
        },
        getDistributionEpochDetails() {
          return this.state.distributionSchedule[this.state.currentEpoch];
        },
        updateEpochDetails() {
          console.log('current epoch --- BEFORE', this.state.currentEpoch);
          console.log('tokenQuantity --- BEFORE', this.state.tokenQuantity);

          this.state.currentEpoch += 1;
          this.state.tokenQuantity =
            this.facets.helper.getDistributionEpochDetails().tokenQuantity;
          console.log('current epoch --- AFTER', this.state.currentEpoch);
          console.log('tokenQuantity --- AFTER', this.state.tokenQuantity);
          void this.facets.helper.updateDistributionMultiplier();
        },
        async updateDistributionMultiplier() {
          const { facets } = this;
          const epochDetails = facets.helper.getDistributionEpochDetails();

          const { absValue } = await E(timer).getCurrentTimestamp();

          console.log('------------------------');
          console.log('currentTime::', absValue);
          console.log(
            'cancelToken ::: BEFORE UPDATE',
            this.state.currentCancelToken,
          );

          this.state.currentCancelToken = cancelTokenMaker();

          await E(timer).setWakeup(
            absValue + epochDetails.windowLength,
            makeWaker('updateDistributionEpochWaker', ts => {
              facets.helper.updateEpochDetails();
              console.log('wakeup has been hit!', { ts, epochDetails });
            }),
          );
        },
      },
      creator: {
        createPayment() {
          return this.state.internalPurse.withdraw(
            this.facets.helper.makeAmountForClaimer(),
          );
        },
        async prepareAirdropCampaign() {
          console.group('---------- inside prepareAirdropCampaign----------');
          console.log('------------------------');
          console.log(
            'this.state.distributionSchedulew::',
            await E(this.state.dsm).getStatus(),
          );
          console.log('------------------------');
          console.log('this.state.status::', this.state.dsm);
          console.log('------------------------');
          console.log(
            'this.state.currentCancelToken::',
            this.state.currentCancelToken,
          );

          console.log('------------------------');
          console.groupEnd();

          // void E(timer).setWakeup(
          //   startTime,
          //   Far('Waker', {
          //     wake(ts) {
          //       handleStateTransition(ts);
          //     },
          //   }),
          //   this.state.currentCancelToken,
          // );
          const {
            facets,
            state: {
              dsm: { transitionTo },
            },
          } = this;
          await E(timer).setWakeup(
            startTime,
            makeWaker('claimWindowOpenWaker', () => {
              transitionTo(states.OPEN);
              void facets.helper.updateDistributionMultiplier();
            }),
            this.state.cancelToken,
          );
        },
      },
      claimer: {
        getStatus() {
          return this.state.dsm.getStatus();
        },
        view() {
          const { count } = this.state;
          return count;
        },
        claim() {
          const {
            internalPurse,
            claimedAccounts,
            distributionSchedule: { schedule, currentEpoch },
          } = this.state;
          assert(
            stateMachine.getStatus() === states.open,
            'Claim attempt failed.',
          );
          /** @type {OfferHandler} */
          const claimHandler = async (seat, offerArgs) => {
            // TODO
            const airdropPayment = this.facets.creator.createPayment();

            return airdropPayment;
          };
          return zcf.makeInvitation(claimHandler, 'airdrop claim handler');
        },
      },
    },
  );

  const { creator, claimer } = makeUnderlyingAirdropKit(
    airdropPurse,
    distributionSchedule,
    stateMachine,
    claimedAccountsStore,
  );

  return harden({
    creatorFacet: creator,
    publicFacet: claimer,
  });
};
harden(start);
