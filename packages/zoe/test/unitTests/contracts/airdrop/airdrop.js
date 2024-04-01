import { M } from '@endo/patterns';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { prepareOwnable } from '../../../../src/contractSupport/prepare-ownable.js';

/**
 * @param arg
 * @param keyName
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
/**
 * @param {ZCF} zcf
 * @param {{ purse: Purse, timer: import('@agoric/swingset-vat/tools/manual-timer.js').TimerService,}} privateArgs
 * @param {import('@agoric/vat-data').Baggage} baggage
 */
export const start = async (zcf, privateArgs, baggage) => {
  const zone = makeDurableZone(baggage, 'rootZone');
  const { AirdropUtils, startTime } = zcf.getTerms();

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
  const { count: startCount = 0n, purse: airdropPurse, timer } = privateArgs;
  assert.typeof(startCount, 'bigint');
  assert(airdropPurse, 'contract must be estarted with a purse');
  assert(timer, 'contract must be estarted with a timer');

  console.log('ZONE API::::', { zone });
  const makeUnderlyingAirdropKit = zone.exoClassKit(
    'Airdrop Campaign',
    {
      helper: M.interface('Helper', {
        cancelTimer: M.call().returns(M.promise()),
        getDistributionEpochDetails: M.call().returns(M.record()),
        handleUpdateEpoch: M.call().returns(M.string()),
      }),
      creator: M.interface('OwnableAirdrop', {
        prepareAirdropCampaign: M.call().returns(M.promise()),
        claim: M.call().returns(M.promise()),
        incr: M.call().returns(M.bigint()),
        // required by makePrepareOwnableClass
        getInvitationCustomDetails: M.call().returns(
          harden({
            count: M.bigint(),
          }),
        ),
      }),
      viewer: M.interface('ViewAirdrop', {
        view: M.call().returns(M.bigint()),
        getStatus: M.call().returns(M.string()),
      }),
    },
    /**
     * @param {bigint} count
     * @param {Purse} tokenPurse
     * @param {Array} schedule
     * @param stateMachine
     * @param dsm
     * @param store
     */
    (count, tokenPurse, schedule, dsm, store) => ({
      currentCancelToken: cancelTokenMaker(),
      count,
      distributionSchedule: harden({
        currentEpoch: 0,
        schedule,
      }),
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
        async cancelTimer() {
          await E(timer).cancel(this.state.currentCancelToken);
        },
        getDistributionEpochDetails() {
          return this.state.distributionSchedule.schedule[
            this.state.distributionSchedule.currentEpoch
          ];
        },
        handleUpdateEpoch() {
          const epochDetails = this.facets.helper.getDistributionEpochDetails();
          console.log(
            'cancelToken ::: BEFORE UPDATE',
            this.state.currentCancelToken,
          );
          console.log('epochDetails ::: BEFORE UPDATE', epochDetails);

          this.state.currentCancelToken = cancelTokenMaker();
          void E(timer).setWakeup(
            epochDetails.windowLength,
            Far('Epoch Change Waker', {
              wake: () => this.facets.helper.handleUpdateEpoch(),
            }),
            this.state.currentCancelToken,
          );
          console.log(
            'cancelToken ::: AFTER UPDATE',
            this.state.currentCancelToken,
          );
          return `Successfully updated Airdrop Epoch. Current epoch #${this.state.distributionSchedule.currentEpoch}`;
        },
      },
      creator: {
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

          const handleStateTransition = ts => {
            this.state.dsm.transitionTo(states.OPEN);
            console.log('Current state::', this.state.dsm.getStatus(), ts);
            this.facets.helper.handleUpdateEpoch();
          };
          void E(timer).setWakeup(
            startTime,
            Far('Waker', {
              wake(ts) {
                handleStateTransition(ts);
              },
            }),
            this.state.currentCancelToken,
          );
        },
        claim() {
          assert(
            stateMachine.getStatus() === states.open,
            'Claim attempt failed.',
          );
          /** @type {OfferHandler} */
          const claimHandler = async (seat, offerArgs) => {
            // TODO
          };
          return zcf.makeInvitation(claimHandler, 'airdrop claim handler');
        },
        incr() {
          const {
            internalPurse,
            claimedAccounts,
            distributionSchedule: { schedule, currentEpoch },
          } = this.state;
          console.group('---------- inside incr----------');
          console.log('------------------------');
          console.log('this.state::', claimedAccounts);
          console.log('------------------------');
          console.log('this.distributionSchedule::', schedule);
          console.log('------------------------');
          console.log('this.distributionSchedule[0]::', schedule[currentEpoch]);
          console.log('------------------------');
          console.log(
            'this.state.purse.getCurrentAmount::',
            internalPurse.getCurrentAmount(),
          );
          console.log('------------------------');
          console.groupEnd();

          this.state.count += 1n;
          return this.state.count;
        },
        getInvitationCustomDetails() {
          const { count } = this.state;
          return harden({
            count,
          });
        },
      },
      viewer: {
        getStatus() {
          return this.state.dsm.getStatus();
        },
        view() {
          const { count } = this.state;
          return count;
        },
      },
    },
  );

  const { creator, viewer } = makeUnderlyingAirdropKit(
    startCount,

    airdropPurse,
    distributionSchedule,
    stateMachine,
    claimedAccountsStore,
  );

  return harden({
    creatorFacet: creator,
    publicFacet: viewer,
  });
};
harden(start);
