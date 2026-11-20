/**
 * Preflight before a payout (#1364): the recipient account must exist and be funded, and for a
 * non-native asset it must hold a trustline that is authorised and has room for the amount.
 * Failing here means no transaction is built, so no fee is spent and no sequence number is used.
 */
export interface PayoutAccountBalance {
  /** `native` for XLM, otherwise `credit_alphanum4` / `credit_alphanum12`. */
  assetType: string;
  assetCode?: string;
  assetIssuer?: string;
  /** Decimal string in whole units (Horizon format). */
  balance: string;
  /** Trustline limit, decimal string (absent for native). */
  limit?: string;
  isAuthorized?: boolean;
}

export interface PayoutAccount {
  subentryCount: number;
  balances: PayoutAccountBalance[];
}

/** Resolves to `null` when the account does not exist on the network. */
export type AccountLoader = (address: string) => Promise<PayoutAccount | null>;

export type PayoutPreflightIssue =
  | { code: 'ACCOUNT_NOT_FOUND'; message: string }
  | { code: 'ACCOUNT_NOT_FUNDED'; message: string }
  | { code: 'NO_TRUSTLINE'; message: string }
  | { code: 'TRUSTLINE_NOT_AUTHORIZED'; message: string }
  | { code: 'TRUSTLINE_LIMIT_EXCEEDED'; message: string };

export interface PayoutPreflightResult {
  ok: boolean;
  issues: PayoutPreflightIssue[];
}

export class PayoutPreflightError extends Error {
  constructor(public readonly issues: PayoutPreflightIssue[]) {
    super(`Payout preflight failed: ${issues.map((i) => i.code).join(', ')}`);
    this.name = 'PayoutPreflightError';
  }
}

/** XLM base reserve is 0.5; an account needs (2 + subentries) * 0.5 XLM. */
export function minimumBalanceXlm(subentryCount: number): number {
  return (2 + subentryCount) * 0.5;
}

export interface PayoutAsset {
  /** `native` or the asset code. */
  code: string;
  issuer?: string;
}

export async function preflightPayout(params: {
  recipient: string;
  asset: PayoutAsset;
  /** Amount in whole units, decimal string. */
  amount: string;
  loadAccount: AccountLoader;
}): Promise<PayoutPreflightResult> {
  const issues: PayoutPreflightIssue[] = [];
  const account = await params.loadAccount(params.recipient);

  if (!account) {
    issues.push({
      code: 'ACCOUNT_NOT_FOUND',
      message: `Recipient ${params.recipient} does not exist on the network (it needs a create_account first).`,
    });
    return { ok: false, issues };
  }

  const native = account.balances.find((b) => b.assetType === 'native');
  const nativeBalance = native ? parseFloat(native.balance) : 0;
  if (nativeBalance < minimumBalanceXlm(account.subentryCount)) {
    issues.push({
      code: 'ACCOUNT_NOT_FUNDED',
      message: `Recipient holds ${nativeBalance} XLM, below its minimum balance of ${minimumBalanceXlm(account.subentryCount)} XLM.`,
    });
  }

  if (params.asset.code !== 'native') {
    const line = account.balances.find(
      (b) => b.assetCode === params.asset.code && (!params.asset.issuer || b.assetIssuer === params.asset.issuer),
    );
    if (!line) {
      issues.push({ code: 'NO_TRUSTLINE', message: `Recipient has no trustline for ${params.asset.code}.` });
    } else {
      if (line.isAuthorized === false) {
        issues.push({ code: 'TRUSTLINE_NOT_AUTHORIZED', message: `The ${params.asset.code} trustline is not authorized by the issuer.` });
      }
      if (line.limit !== undefined && parseFloat(line.balance) + parseFloat(params.amount) > parseFloat(line.limit)) {
        issues.push({ code: 'TRUSTLINE_LIMIT_EXCEEDED', message: `Paying ${params.amount} would exceed the ${params.asset.code} trustline limit.` });
      }
    }
  }

  return { ok: issues.length === 0, issues };
}

export async function assertPayoutPreflight(params: Parameters<typeof preflightPayout>[0]): Promise<void> {
  const result = await preflightPayout(params);
  if (!result.ok) throw new PayoutPreflightError(result.issues);
}
