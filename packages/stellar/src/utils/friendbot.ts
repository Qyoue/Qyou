/**
 * Friendbot / test-account funding helper for local and testnet development.
 *
 * Funds a Stellar account on the public testnet friendbot or the bundled
 * Quickstart container friendbot (http://localhost:8000) so local flows do not
 * require a real network or a pre-funded account.
 */

export const PUBLIC_TESTNET_FRIENDBOT_URL = 'https://friendbot.stellar.org/';
export const LOCAL_QUICKSTART_FRIENDBOT_URL = 'http://localhost:8000/';

export interface FundTestAccountOptions {
  /** Friendbot base URL. Defaults to the public testnet friendbot. */
  friendbotUrl?: string;
  /** Request timeout in milliseconds. Defaults to 10_000. */
  timeoutMs?: number;
}

export type FundTestAccountStatus = 'SUCCESS' | 'ALREADY_FUNDED' | 'FAILED';

export interface FundTestAccountResult {
  readonly publicKey: string;
  readonly status: FundTestAccountStatus;
  readonly funded: boolean;
  readonly message?: string;
}

/** Validates an Ed25519 StrKey public key (56 chars, starts with 'G', Base32). */
export function isPublicKey(publicKey: string): boolean {
  return typeof publicKey === 'string' && /^G[A-Z2-7]{55}$/.test(publicKey);
}

/**
 * Requests funding for `publicKey` from the given friendbot and reports
 * whether the account was funded (or was already funded on a previous run).
 */
export async function fundTestAccount(
  publicKey: string,
  options: FundTestAccountOptions = {},
): Promise<FundTestAccountResult> {
  if (!isPublicKey(publicKey)) {
    return {
      publicKey,
      status: 'FAILED',
      funded: false,
      message: 'INVALID_PUBLIC_KEY',
    };
  }

  const base = (options.friendbotUrl ?? PUBLIC_TESTNET_FRIENDBOT_URL).replace(/\/+$/, '');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 10_000);

  try {
    const url = `${base}/?addr=${encodeURIComponent(publicKey)}`;
    const res = await fetch(url, { method: 'GET', signal: controller.signal });

    if (res.ok) {
      return { publicKey, status: 'SUCCESS', funded: true };
    }

    const body = await res.json().catch(() => null);
    const message = typeof body?.detail === 'string' ? body.detail : `HTTP ${res.status}`;

    // Friendbot rejects accounts that already have a balance/trustline funding.
    const alreadyFunded = /already|funded|exists|trusted/i.test(message);
    if (res.status === 400 && alreadyFunded) {
      return { publicKey, status: 'ALREADY_FUNDED', funded: true, message };
    }

    return { publicKey, status: 'FAILED', funded: false, message };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return { publicKey, status: 'FAILED', funded: false, message };
  } finally {
    clearTimeout(timer);
  }
}