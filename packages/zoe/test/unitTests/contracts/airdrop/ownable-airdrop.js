import { M } from '@endo/patterns';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { prepareOwnable } from '../../../../src/contractSupport/prepare-ownable.js';

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

  console.log({ stateMachine, states });
  const { count: startCount = 0n, purse: airdropPurse, timer } = privateArgs;
  assert.typeof(startCount, 'bigint');
  assert(airdropPurse, 'contract must be estarted with a purse');
  assert(timer, 'contract must be estarted with a timer');

  void E(timer).setWakeup(
    startTime,
    Far('Waker', {
      wake(ts) {
        stateMachine.transitionTo(states.OPEN);
        console.log('Airdrop is officially opened');
        conwsole.log('Current state::', stateMachine.getStatus(), ts);
      },
    }),
  );
  const makeUnderlyingAirdropKit = zone.exoClassKit(
    'OwnableAirdrop',
    {
      airdrop: M.interface(
        'OwnableAirdrop',
        {
          claim: M.call().returns(M.promise()),
          incr: M.call().returns(M.bigint()),
          // required by makePrepareOwnableClass
          getInvitationCustomDetails: M.call().returns(
            harden({
              count: M.bigint(),
            }),
          ),
          toBeAttenuated: M.call().returns(),
        },
        { sloppy: true },
      ),
      viewer: M.interface('ViewAirdrop', {
        view: M.call().returns(M.bigint()),
        getStatus: M.call().returns(M.string()),
      }),
    },
    /**
     * @param {bigint} count
     * @param {Purse} tokenPurse
     * @param {Array} schedule
     * @param store
     */
    (count, tokenPurse, schedule, store) => ({
      count,
      distributionSchedule: harden({
        currentEpoch: 0,
        schedule,
      }),
      internalPurse: tokenPurse,
      claimedAccounts: store,
      status: stateMachine.transitionTo(states.PREPARED),
    }),
    {
      airdrop: {
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
        toBeAttenuated() {},
      },
      viewer: {
        getStatus() {
          return this.state.status;
        },
        view() {
          const { count } = this.state;
          return count;
        },
      },
    },
  );

  const makeOwnableAirdrop = prepareOwnable(
    zone,
    (...args) => zcf.makeInvitation(...args),
    'OwnableAirdrop',
    /** @type {const} */ (['claim', 'incr', 'getInvitationCustomDetails']),
  );

  const { airdrop: underlyingAirdrop, viewer } = makeUnderlyingAirdropKit(
    startCount,

    airdropPurse,
    distributionSchedule,
    claimedAccountsStore,
  );

  const ownableAirdrop = makeOwnableAirdrop(underlyingAirdrop);

  return harden({
    creatorFacet: ownableAirdrop,
    publicFacet: viewer,
  });
};
harden(start);
