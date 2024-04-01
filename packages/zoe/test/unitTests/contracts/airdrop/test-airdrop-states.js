// @ts-check
import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { createRequire } from 'module';
import { makeStateMachine } from '../../../../src/contractSupport/stateMachine.js';

/** @type {import('ava').TestFn<Awaited<ReturnType<makeBundleCacheContext>>>} */
const test = anyTest;

const AIRDROP_STATES = {
  INITIALIZED: 'initialized',
  PREPARED: 'prepared',
  OPEN: 'claim-window-open',
  EXPIRED: 'claim-window-expired',
  CLOSED: 'claiming-closed',
  RESTARTING: 'restarting',
};
const { OPEN, EXPIRED, PREPARED, INITIALIZED, RESTARTING } = AIRDROP_STATES;

test('ERTP Airdrop state machine', t => {
  const startState = INITIALIZED;
  const allowedTransitions = [
    [startState, [PREPARED]],
    [PREPARED, [OPEN]],
    [OPEN, [EXPIRED, RESTARTING]],
    [RESTARTING, [OPEN]],
    [EXPIRED, []],
  ];

  const stateMachine = makeStateMachine(startState, allowedTransitions);
  t.is(stateMachine.getStatus(), INITIALIZED);

  stateMachine.transitionTo(PREPARED);

  t.is(
    stateMachine.getStatus(),
    PREPARED,
    'stateMachine should transition into a prepared state ',
  );

  t.deepEqual(
    stateMachine.getStatus(),
    PREPARED,
    'stateMachine should transition into a prepared state ',
  );
  stateMachine.transitionTo(OPEN);
  t.deepEqual(
    stateMachine.getStatus(),
    OPEN,
    'stateMachine should transition to an OPEN state',
  );

  stateMachine.transitionTo(EXPIRED);
  t.deepEqual(
    stateMachine.getStatus(),
    EXPIRED,
    'stateMachine should transition to an claim-window-expired state',
  );
});
