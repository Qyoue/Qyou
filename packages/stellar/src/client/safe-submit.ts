/**
 * Safe submission helpers (#1119-#1122). Standalone: it does not import `horizon.client.ts` or
 * `incentive_retry.ts`; those should call into it (see docs/stellar-safe-submission.md).
 */

export type ErrorKind = 'network' | 'timeout' | 'rate_limited' | 'validation' | 'unknown';

/** Kinds that are safe to retry. `unknown` is treated as not retryable. */
export const RETRYABLE_KINDS: ReadonlySet<ErrorKind> = new Set(['network', 'timeout', 'rate_limited']);

export interface RetryOptions {
  attempts?: number;
  baseDelayMs?: number;
  classify?: (error: unknown) => ErrorKind;
  sleep?: (ms: number) => Promise<void>;
}

/** Default classifier; a `StellarError` subclass can expose `kind` and it is honoured as-is. */
export function classifyError(error: unknown): ErrorKind {
  const kind = (error as { kind?: ErrorKind } | null)?.kind;
  if (kind) return kind;
  const e = error as { code?: string; name?: string; response?: { status?: number } } | null;
  if (e?.name === 'AbortError' || e?.code === 'ETIMEDOUT') return 'timeout';
  if (e?.response?.status === 429) return 'rate_limited';
  if (e?.response?.status && e.response.status >= 400 && e.response.status < 500) return 'validation';
  if (e?.code === 'ECONNRESET' || e?.code === 'ECONNREFUSED' || e?.code === 'ENOTFOUND') return 'network';
  return 'unknown';
}

/** Retries only retryable kinds and rethrows the ORIGINAL error (with `cause` on exhaustion). */
export async function retryWithCause<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const { attempts = 3, baseDelayMs = 250, classify = classifyError, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = opts;
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      last = error;
      if (!RETRYABLE_KINDS.has(classify(error)) || i === attempts - 1) break;
      await sleep(baseDelayMs * 2 ** i);
    }
  }
  if (last instanceof Error) {
    // Keep the original type and message; attach the failure so callers can inspect it.
    if (!('cause' in last)) (last as Error & { cause?: unknown }).cause = last;
    throw last;
  }
  throw new Error('Retry failed', { cause: last });
}

export interface SubmitDeps<T> {
  /** Hash of the already-signed transaction (known before submission). */
  txHash: string;
  submit: () => Promise<T>;
  /** Returns the confirmed transaction for a hash, or null when the ledger has none. */
  lookup: (hash: string) => Promise<T | null>;
}

/**
 * Submit a signed transaction without double-paying. After a retryable error (for example a
 * timeout where the request may still have reached the network) the hash is looked up first;
 * a confirmed transaction is returned instead of being submitted again.
 */
export async function submitIdempotent<T>(deps: SubmitDeps<T>, opts: RetryOptions = {}): Promise<T> {
  const classify = opts.classify ?? classifyError;
  let attempted = false;
  return retryWithCause(async () => {
    if (attempted) {
      const existing = await deps.lookup(deps.txHash);
      if (existing) return existing;
    }
    attempted = true;
    return deps.submit();
  }, { ...opts, classify });
}

/** Supported timeout mechanism (replaces reaching into `(server as any).axios`). */
export async function withTimeout<T>(fn: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}
