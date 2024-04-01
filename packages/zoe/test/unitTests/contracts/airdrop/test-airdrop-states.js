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

test('ERTP Airdrop state machine', async t => {
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
  t.is(stateMachine.transitionTo(EXPIRED), new Error('Check failed.'));
});
