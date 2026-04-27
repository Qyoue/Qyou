/** Transaction memo schema — issue #240
 *
 * Memo format: <kind>:<referenceId>
 * Max 28 bytes (Stellar TEXT memo limit).
 * Kinds: RWD=reward, BDY=buddy, ESC=escrow, REP=reputation
 */

export type MemoKind = 'RWD' | 'BDY' | 'ESC' | 'REP';

const MAX_MEMO_BYTES = 28;

export type ParsedMemo = {
  kind: MemoKind;
  referenceId: string;
};

/** Build a deterministic memo string from kind + referenceId. */
export function buildMemo(kind: MemoKind, referenceId: string): string {
  const memo = `${kind}:${referenceId}`;
  const bytes = Buffer.byteLength(memo, 'utf8');
  if (bytes > MAX_MEMO_BYTES) {
    throw new Error(
      `Memo "${memo}" is ${bytes} bytes — exceeds ${MAX_MEMO_BYTES}-byte limit`,
    );
  }
  return memo;
}

/** Parse a memo string back into its components. Returns null on invalid format. */
export function parseMemo(raw: string): ParsedMemo | null {
  const sep = raw.indexOf(':');
  if (sep === -1) return null;
  const kind = raw.slice(0, sep) as MemoKind;
  const referenceId = raw.slice(sep + 1);
  if (!['RWD', 'BDY', 'ESC', 'REP'].includes(kind) || !referenceId) return null;
  return { kind, referenceId };
}

/** Validate that a memo string conforms to the schema. */
export function validateMemo(raw: string): boolean {
  if (Buffer.byteLength(raw, 'utf8') > MAX_MEMO_BYTES) return false;
  return parseMemo(raw) !== null;
}
