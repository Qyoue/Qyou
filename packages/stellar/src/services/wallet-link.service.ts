import { randomUUID, randomBytes } from 'node:crypto';
import type { InitiateWalletLinkInput, InitiateWalletLinkResult } from '../types/wallet-link.types.js';
import type { WalletLinkStore } from '../stores/wallet-link.store.js';

/** How long (ms) a challenge remains valid before it expires. */
const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Max concurrent pending requests allowed per user (rate-limit guard). */
const MAX_PENDING_PER_USER = 1;

export class WalletLinkConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WalletLinkConflictError';
  }
}

export class WalletLinkValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WalletLinkValidationError';
  }
}

/** Validates that the string looks like a Stellar public key (G + 54–55 base32 chars). */
function isValidStellarAddress(address: string): boolean {
  return /^G[A-Z2-7]{54,55}$/.test(address);
}

export class WalletLinkService {
  constructor(private readonly store: WalletLinkStore) {}

  /**
   * Initiates a wallet-link request.
   *
   * Hardening applied (AUTH-078):
   * - Validates the Stellar address format before persisting anything.
   * - Rejects blank / missing userId to prevent anonymous link attempts.
   * - Prevents a second concurrent pending request for the same user
   *   (race/abuse guard — one pending request at a time).
   * - Prevents linking a Stellar address already claimed by a different
   *   pending request (replay / duplicate-claim guard).
   * - Issues a cryptographically random 32-byte challenge so it cannot be
   *   predicted or reused across attempts.
   * - Sets a short TTL (5 min) so stale challenges expire automatically.
   */
  async initiate(input: InitiateWalletLinkInput): Promise<InitiateWalletLinkResult> {
    // --- Input validation ---
    if (!input.userId || input.userId.trim() === '') {
      throw new WalletLinkValidationError('userId is required.');
    }
    if (!isValidStellarAddress(input.stellarAddress)) {
      throw new WalletLinkValidationError(
        'Enter a valid Stellar public key (G… address).',
      );
    }

    // --- Abuse / race guards ---
    const [existingForUser, existingForAddress] = await Promise.all([
      this.store.findPendingByUserId(input.userId),
      this.store.findPendingByStellarAddress(input.stellarAddress),
    ]);

    if (existingForUser) {
      throw new WalletLinkConflictError(
        'A pending wallet-link request already exists for this user. Cancel it before starting a new one.',
      );
    }

    if (existingForAddress) {
      throw new WalletLinkConflictError(
        'A pending wallet-link request already exists for this Stellar address.',
      );
    }

    // --- Create the request ---
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CHALLENGE_TTL_MS);
    const challenge = randomBytes(32).toString('hex');

    const request = {
      id: randomUUID(),
      userId: input.userId.trim(),
      stellarAddress: input.stellarAddress,
      status: 'pending' as const,
      challenge,
      expiresAt,
      createdAt: now,
    };

    await this.store.save(request);

    return { requestId: request.id, challenge, expiresAt };
  }
}
