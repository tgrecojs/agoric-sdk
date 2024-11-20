import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { makeE2ETools } from './e2e-tools.js';

const XNET_CONSTANTS = {
  RPC: "https://xnet.rpc.agoric.net:443",

  LCD: "https://xnet.api.agoric.net:443"

}
export const makeAgdTools = async (
  log: typeof console.log,
  {
    execFile,
    execFileSync,
  }: Pick<typeof import('child_process'), 'execFile' | 'execFileSync'>,
) => {
  const bundleCache = await unsafeMakeBundleCache('bundles');
  const tools = await makeE2ETools(log, bundleCache, {
    execFileSync,
    execFile,
    fetch,
    setTimeout,
    rpcAddress: XNET_CONSTANTS.RPC,
    apiAddress: XNET_CONSTANTS.LCD
  });
  return tools;
};

export type AgdTools = Awaited<ReturnType<typeof makeAgdTools>>;
