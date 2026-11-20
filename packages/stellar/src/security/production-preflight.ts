/**
 * Production-readiness preflight (#1360).
 *
 * The in-memory kill switch, secrets provider and challenge store are the
 * defaults outside production. In production and staging they would lose state
 * on restart (a halted pool would resume, replayed challenges would work again)
 * so the process refuses to boot with them.
 */
import { InMemoryKillSwitchStorage, type KillSwitchStorage } from './kill-switch.js';
import { InMemorySecretsProvider, type ISecretsManagerProvider } from './secrets-manager.js';

export interface PreflightFinding {
  readonly id: 'kill-switch' | 'secrets-provider' | 'challenge-store' | 'mainnet-opt-in' | 'signer';
  readonly ok: boolean;
  readonly message: string;
}

export interface PreflightInputs {
  readonly env?: Record<string, string | undefined>;
  readonly killSwitchStorage?: KillSwitchStorage;
  readonly secretsProvider?: ISecretsManagerProvider;
  /** `persistent` once the wallet challenge store is database or cache backed. */
  readonly challengeStore?: 'memory' | 'persistent';
}

export class ProductionPreflightError extends Error {
  constructor(public readonly findings: readonly PreflightFinding[]) {
    super(
      `Production preflight failed:\n${findings
        .filter((f) => !f.ok)
        .map((f) => ` - [${f.id}] ${f.message}`)
        .join('\n')}`
    );
    this.name = 'ProductionPreflightError';
  }
}

export function isProductionLike(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV === 'production' || env.NODE_ENV === 'staging';
}

export function runProductionPreflight(inputs: PreflightInputs = {}): PreflightFinding[] {
  const env = inputs.env ?? process.env;
  const findings: PreflightFinding[] = [];

  const ks = inputs.killSwitchStorage;
  findings.push({
    id: 'kill-switch',
    ok: !!ks && !(ks instanceof InMemoryKillSwitchStorage),
    message: 'kill switch must use persistent storage, not InMemoryKillSwitchStorage',
  });

  const sp = inputs.secretsProvider;
  findings.push({
    id: 'secrets-provider',
    ok: !!sp && !(sp instanceof InMemorySecretsProvider),
    message: 'secrets must come from AWS Secrets Manager or Vault, not InMemorySecretsProvider',
  });

  findings.push({
    id: 'challenge-store',
    ok: inputs.challengeStore === 'persistent',
    message: 'wallet challenges must be stored persistently (single-use across restarts and instances)',
  });

  const network = (env.STELLAR_NETWORK ?? 'TESTNET').toUpperCase();
  const mainnet = network === 'MAINNET' || network === 'PUBLIC';
  findings.push({
    id: 'mainnet-opt-in',
    ok: !mainnet || env.STELLAR_ALLOW_MAINNET === 'true',
    message: 'MAINNET requires an explicit STELLAR_ALLOW_MAINNET=true',
  });

  return findings;
}

/** Throws in production and staging when any check fails; a no-op elsewhere. */
export function assertProductionPreflight(inputs: PreflightInputs = {}): void {
  const env = inputs.env ?? process.env;
  if (!isProductionLike(env)) return;
  const findings = runProductionPreflight(inputs);
  if (findings.some((f) => !f.ok)) throw new ProductionPreflightError(findings);
}
