/**
 * Soroban invocation pipeline (#1123, #1124, #1125) and QYOU trustline helpers (#1126).
 * Written against narrow structural interfaces so it works with `rpc.Server` from
 * `@stellar/stellar-sdk` without importing the harness in `client.ts` / `incentive-pool.ts`.
 */
import { Asset, Operation } from '@stellar/stellar-sdk';

/** Subset of `rpc.Server` used here. */
export interface SorobanRpcLike {
  simulateTransaction(tx: unknown): Promise<{ error?: string; minResourceFee?: string }>;
  prepareTransaction(tx: unknown): Promise<PreparedTx>;
  sendTransaction(tx: unknown): Promise<{ status: string; hash: string; errorResult?: unknown }>;
  getTransaction(hash: string): Promise<{ status: 'SUCCESS' | 'FAILED' | 'NOT_FOUND'; returnValue?: unknown }>;
}

export interface PreparedTx {
  /** Resource fee in stroops as chosen by simulation (from the prepared transaction). */
  fee: string;
  sign(keypair: unknown): void;
}

export interface InvokeOptions {
  /** Fee buffer applied on top of the simulated resource fee. Default 1.15 (15%). */
  feeBufferMultiplier?: number;
  /** Hard ceiling in stroops; invocation is refused above it. */
  maxFeeStroops: bigint;
  pollIntervalMs?: number;
  pollTimeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

export class SorobanInvocationError extends Error {
  constructor(message: string, readonly code: 'SIMULATION_FAILED' | 'FEE_TOO_HIGH' | 'SEND_FAILED' | 'TX_FAILED' | 'TIMEOUT') {
    super(message);
    this.name = 'SorobanInvocationError';
  }
}

/** simulate -> prepare -> (fee check) -> sign -> send -> poll. */
export async function invokeContract(
  rpc: SorobanRpcLike,
  tx: unknown,
  signer: unknown,
  opts: InvokeOptions,
): Promise<{ hash: string; returnValue?: unknown }> {
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const sim = await rpc.simulateTransaction(tx);
  if (sim.error) throw new SorobanInvocationError(`Simulation failed: ${sim.error}`, 'SIMULATION_FAILED');

  // prepareTransaction applies the simulated footprint, auth entries and resource fee.
  const prepared = await rpc.prepareTransaction(tx);
  const buffered = BigInt(Math.ceil(Number(prepared.fee) * (opts.feeBufferMultiplier ?? 1.15)));
  if (buffered > opts.maxFeeStroops) {
    throw new SorobanInvocationError(`Fee ${buffered} exceeds maximum ${opts.maxFeeStroops}`, 'FEE_TOO_HIGH');
  }
  (prepared as unknown as { fee: string }).fee = buffered.toString();
  prepared.sign(signer);

  const sent = await rpc.sendTransaction(prepared);
  if (sent.status === 'ERROR') throw new SorobanInvocationError('Transaction rejected by RPC', 'SEND_FAILED');

  const deadline = Date.now() + (opts.pollTimeoutMs ?? 30_000);
  while (Date.now() < deadline) {
    const res = await rpc.getTransaction(sent.hash);
    if (res.status === 'SUCCESS') return { hash: sent.hash, returnValue: res.returnValue };
    if (res.status === 'FAILED') throw new SorobanInvocationError(`Transaction ${sent.hash} failed`, 'TX_FAILED');
    await sleep(opts.pollIntervalMs ?? 1_000);
  }
  throw new SorobanInvocationError(`Timed out waiting for ${sent.hash}`, 'TIMEOUT');
}

// ---- #1125 TTL extension ----

/** Build an `extendFootprintTtl` operation; ledgers are counted from the current ledger. */
export function buildExtendTtlOp(extendToLedgers: number) {
  return Operation.extendFootprintTtl({ extendTo: extendToLedgers });
}

export interface TtlStatus {
  liveUntilLedger: number;
  currentLedger: number;
}

/** True when remaining TTL is below the alert threshold (the monitor calls this on a schedule). */
export function isTtlLow(status: TtlStatus, thresholdLedgers: number): boolean {
  return status.liveUntilLedger - status.currentLedger < thresholdLedgers;
}

// ---- #1126 QYOU trustline ----

export interface QyouAssetConfig {
  code: string;
  /** Issuer public key per network; missing network is a configuration error. */
  issuers: Record<string, string>;
}

export class MissingTrustlineError extends Error {
  constructor(readonly account: string, readonly asset: string) {
    super(`Account ${account} has no trustline for ${asset}`);
    this.name = 'MissingTrustlineError';
  }
}

export function qyouAsset(cfg: QyouAssetConfig, network: string): Asset {
  const issuer = cfg.issuers[network];
  if (!issuer) throw new Error(`No ${cfg.code} issuer configured for network "${network}"`);
  return new Asset(cfg.code, issuer);
}

/** Operation to add the trustline; the account signs and submits it like any other transaction. */
export function buildChangeTrustOp(asset: Asset, limit?: string) {
  return Operation.changeTrust(limit ? { asset, limit } : { asset });
}

/** Call before payout; `balances` is the `balances` array of a Horizon account record. */
export function assertTrustline(
  account: string,
  balances: Array<{ asset_type: string; asset_code?: string; asset_issuer?: string }>,
  asset: Asset,
): void {
  const ok = balances.some((b) => b.asset_code === asset.getCode() && b.asset_issuer === asset.getIssuer());
  if (!ok) throw new MissingTrustlineError(account, `${asset.getCode()}:${asset.getIssuer()}`);
}
