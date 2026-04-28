export type TxErrorCode =
  | 'ACCOUNT_NOT_FOUND'
  | 'INSUFFICIENT_BALANCE'
  | 'BAD_SEQUENCE'
  | 'INVALID_DESTINATION'
  | 'SUBMISSION_FAILED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface TxError {
  code: TxErrorCode;
  message: string;
  raw?: unknown;
}

const RESULT_CODE_MAP: Record<string, TxErrorCode> = {
  tx_bad_seq: 'BAD_SEQUENCE',
  op_no_destination: 'INVALID_DESTINATION',
  op_underfunded: 'INSUFFICIENT_BALANCE',
  tx_insufficient_balance: 'INSUFFICIENT_BALANCE',
};

export function mapStellarError(err: unknown): TxError {
  if (err instanceof Error) {
    const codes: Record<string, string> | undefined =
      (err as any).response?.data?.extras?.result_codes;

    if (codes) {
      const allCodes = [
        ...(codes.transaction ? [codes.transaction] : []),
        ...(Array.isArray(codes.operations) ? codes.operations : []),
      ];

      for (const code of allCodes) {
        if (RESULT_CODE_MAP[code]) {
          return { code: RESULT_CODE_MAP[code], message: code, raw: codes };
        }
      }
      return { code: 'SUBMISSION_FAILED', message: JSON.stringify(codes), raw: codes };
    }

    if (err.message.toLowerCase().includes('not found')) {
      return { code: 'ACCOUNT_NOT_FOUND', message: err.message };
    }

    if (err.message.toLowerCase().includes('network') || err.message.toLowerCase().includes('fetch')) {
      return { code: 'NETWORK_ERROR', message: err.message };
    }
  }

  return { code: 'UNKNOWN', message: String(err), raw: err };
}
