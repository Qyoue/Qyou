/**
 * Proof-hash schema for reputation anchors.
 *
 * A proof hash is a deterministic SHA-256 digest of a canonical anchor manifest.
 * It is stored on-chain (as a Stellar MemoHash or manageData value) to allow
 * independent verification of off-chain reputation data without exposing raw signals.
 */

export type ProofHashAlgorithm = 'sha256';

/**
 * The canonical fields that are hashed to produce a proof hash.
 * All fields must be serialized in this exact order before hashing.
 */
export type AnchorProofInput = {
  schemaVersion: string;
  anchorType: 'REPUTATION_SIGNAL';
  windowStartUtc: string; // ISO 8601
  windowEndUtc: string;   // ISO 8601
  scopeId: string;
  signalRoot: string;     // Merkle root hex string
  recordCount: number;
  engineVersion: string;
};

/**
 * A computed proof hash record, ready for on-chain submission.
 */
export type AnchorProofHash = {
  algorithm: ProofHashAlgorithm;
  /** Hex-encoded SHA-256 digest of the canonical manifest */
  digest: string;
  /** The input that produced this digest */
  input: AnchorProofInput;
  /** ISO 8601 timestamp of when the hash was computed */
  computedAtUtc: string;
};

/**
 * Serialize an AnchorProofInput to a canonical JSON string for hashing.
 *
 * Fields are sorted alphabetically to ensure determinism across implementations.
 */
export const serializeProofInput = (input: AnchorProofInput): string =>
  JSON.stringify(
    Object.fromEntries(
      Object.entries(input).sort(([a], [b]) => a.localeCompare(b)),
    ),
  );

/**
 * Guidance for proof-hash computation (Node.js):
 *
 * ```typescript
 * import crypto from 'crypto';
 * import { serializeProofInput, AnchorProofInput } from './anchorProof';
 *
 * const computeProofHash = (input: AnchorProofInput): string => {
 *   const canonical = serializeProofInput(input);
 *   return crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
 * };
 * ```
 *
 * The resulting hex string is stored as:
 * - `qyou.rep.rt` manageData value on the anchor transaction, OR
 * - A Stellar MemoHash (32-byte buffer from the first 32 bytes of the hex digest)
 */
