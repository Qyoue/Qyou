/**
 * Production readiness gate (#1361). Run on release branches and before a deploy:
 *
 *   node --import tsx scripts/productionReadinessGate.ts
 *
 * Reads the deployment configuration from the environment and fails unless it describes
 * a production-safe setup: a real signer, a persistent kill switch, a non-memory secrets
 * provider and an explicit mainnet opt-in.
 */
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export interface Finding {
  id: string;
  ok: boolean;
  message: string;
}

type Env = Record<string, string | undefined>;

const MEMORY = /^(memory|in-?memory|none|)$/i;

export function checkReadinessCriteria(env: Env = process.env): Finding[] {
  const findings: Finding[] = [];

  const secret = env.STELLAR_DISTRIBUTION_SECRET_KEY ?? '';
  findings.push({
    id: 'signer',
    ok: /^S[A-Z2-7]{55}$/.test(secret),
    message: 'STELLAR_DISTRIBUTION_SECRET_KEY must be a real Stellar secret seed (S..., 56 chars)',
  });

  findings.push({
    id: 'kill-switch',
    ok: !MEMORY.test(env.KILL_SWITCH_STORAGE ?? ''),
    message: 'KILL_SWITCH_STORAGE must name a persistent store (for example redis or prisma), not memory',
  });

  findings.push({
    id: 'secrets-provider',
    ok: /^(aws|vault)$/i.test(env.SECRETS_PROVIDER ?? ''),
    message: 'SECRETS_PROVIDER must be aws or vault',
  });

  const network = (env.STELLAR_NETWORK ?? 'TESTNET').toUpperCase();
  const mainnet = network === 'MAINNET' || network === 'PUBLIC';
  findings.push({
    id: 'mainnet-opt-in',
    ok: !mainnet || env.STELLAR_ALLOW_MAINNET === 'true',
    message: 'a MAINNET deployment requires STELLAR_ALLOW_MAINNET=true',
  });

  findings.push({
    id: 'node-env',
    ok: env.NODE_ENV === 'production' || env.NODE_ENV === 'staging',
    message: 'NODE_ENV must be production or staging',
  });

  return findings;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const findings = checkReadinessCriteria();
  for (const f of findings) console.log(`${f.ok ? 'PASS' : 'FAIL'}  ${f.id}${f.ok ? '' : ` — ${f.message}`}`);
  process.exit(findings.every((f) => f.ok) ? 0 : 1);
}
