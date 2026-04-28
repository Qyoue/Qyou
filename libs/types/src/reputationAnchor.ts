/** Reputation anchor manifest types — issue #239 */

export type AnchorEventKind =
  | 'REPORT_VERIFIED'
  | 'BUDDY_COMPLETED'
  | 'DISPUTE_RESOLVED'
  | 'REWARD_CLAIMED';

export type AnchorStatus = 'PENDING' | 'ANCHORED' | 'FAILED';

/** A single on-chain reputation anchor record */
export type ReputationAnchor = {
  id: string;
  userId: string;
  eventKind: AnchorEventKind;
  referenceId: string;       // e.g. reportId, buddyRequestId
  scoreImpact: number;       // positive or negative delta
  status: AnchorStatus;
  txHash?: string;           // Stellar transaction hash once anchored
  anchoredAt?: string;       // ISO timestamp
  createdAt: string;
};

/** Manifest bundled before a batch anchor submission */
export type ReputationAnchorManifest = {
  manifestId: string;
  userId: string;
  anchors: ReputationAnchor[];
  totalScoreImpact: number;
  createdAt: string;
};

/** Lightweight summary returned to callers */
export type ReputationAnchorSummary = {
  userId: string;
  currentScore: number;
  pendingAnchors: number;
  lastAnchoredAt: string | null;
};

export type AnchorManifestResponse = {
  manifest: ReputationAnchorManifest;
  summary: ReputationAnchorSummary;
};
