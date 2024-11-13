import type {
  ChainAddress,
  DenomAmount,
  OrchestrationAccount,
} from '@agoric/orchestration';
import type { Zone } from '@agoric/zone';
import type { VowTools } from '@agoric/vow';
import type { HostInterface } from '@agoric/async-flow';
import type { LogFn } from '../src/types.js';

export const prepareMockOrchAccounts = (
  zone: Zone,
  {
    vowTools: { makeVowKit },
    log,
  }: { vowTools: VowTools; log: (...args: any[]) => void },
) => {
  // can only be called once per test
  const poolAccountTransferVK = makeVowKit();

  const mockedPoolAccount = zone.exo('Pool LocalOrchAccount', undefined, {
    transfer(destination: ChainAddress, amount: DenomAmount) {
      log('PoolAccount.transfer() called with', destination, amount);
      return poolAccountTransferVK.vow;
    },
  });

  const poolAccount = mockedPoolAccount as unknown as HostInterface<
    OrchestrationAccount<{
      chainId: 'agoric';
    }>
  >;

  return {
    poolAccount,
    poolAccountTransferVResolver: poolAccountTransferVK.resolver,
  };
};

export const makeTestLogger = (logger: LogFn) => {
  const logs: unknown[][] = [];
  const log = (...args: any[]) => {
    logs.push(args);
    logger(args);
  };
  const inspectLogs = (index?: number) =>
    typeof index === 'number' ? logs[index] : logs;
  return { log, inspectLogs };
};

export type TestLogger = ReturnType<typeof makeTestLogger>;