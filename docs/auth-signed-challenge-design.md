# AUTH-081 — Signed Challenge Verification Flow Design

## Summary

The signed challenge flow is the trust anchor between a product identity (accountId) and a Stellar identity (wallet address). It proves that the caller controls the private key corresponding to a claimed Stellar public key, without the server ever seeing the private key.

## Flow

```
Client                                  Server (stellar-service)
  │                                           │
  │  POST /api/v1/stellar/challenge/issue     │
  │  { walletAddress }                        │
  │ ─────────────────────────────────────────>│
  │                                           │  1. Validate address format
  │                                           │  2. Rate-limit check
  │                                           │  3. Generate nonce (32 random bytes → hex)
  │                                           │  4. Store ChallengeRecord (TTL 5 min)
  │  { challengeId, nonce, expiresAt }        │
  │ <─────────────────────────────────────────│
  │                                           │
  │  [Client signs nonce with Stellar keypair]│
  │                                           │
  │  POST /api/v1/stellar/challenge/verify    │
  │  { challengeId, walletAddress, signature }│
  │ ─────────────────────────────────────────>│
  │                                           │  5. Look up challenge by challengeId
  │                                           │  6. Check not expired
  │                                           │  7. Check not already used
  │                                           │  8. Check walletAddress matches record
  │                                           │  9. Verify Ed25519 signature over nonce
  │                                           │ 10. Mark challenge as used (single-use)
  │                                           │ 11. Emit audit log
  │  { ok: true, walletAddress, verifiedAt }  │
  │ <─────────────────────────────────────────│
```

## Data Shape

### ChallengeRecord (server-side, not exposed)

```ts
type ChallengeRecord = {
  challengeId: string;   // UUID v4
  nonce: string;         // 32-byte hex string (64 chars)
  walletAddress: string; // Stellar G… public key
  issuedAt: string;      // ISO-8601
  expiresAt: number;     // Unix ms (issuedAt + 5 min)
  used: boolean;
};
```

### POST /api/v1/stellar/challenge/issue

Request body:
```json
{ "walletAddress": "G..." }
```

Success (200):
```json
{ "ok": true, "challengeId": "uuid", "nonce": "hex64", "expiresAt": "ISO-8601" }
```

Errors: `VALIDATION_ERROR` (400), `RATE_LIMITED` (429).

### POST /api/v1/stellar/challenge/verify

Request body:
```json
{
  "challengeId": "uuid",
  "walletAddress": "G...",
  "signature": "base64-encoded-ed25519-sig"
}
```

Success (200):
```json
{ "ok": true, "walletAddress": "G...", "verifiedAt": "ISO-8601" }
```

Errors:
| Code | HTTP | Meaning |
|------|------|---------|
| `VALIDATION_ERROR` | 400 | Missing/malformed fields |
| `CHALLENGE_NOT_FOUND` | 404 | Unknown challengeId |
| `CHALLENGE_EXPIRED` | 410 | TTL elapsed |
| `CHALLENGE_ALREADY_USED` | 409 | Replay attempt |
| `ADDRESS_MISMATCH` | 400 | walletAddress doesn't match issued challenge |
| `INVALID_SIGNATURE` | 401 | Signature verification failed |
| `RATE_LIMITED` | 429 | Too many verify attempts |

## Failure States

- **Expired challenge**: client must re-issue. TTL is 5 minutes.
- **Replay attack**: challenges are single-use; second verify returns `CHALLENGE_ALREADY_USED`.
- **Wrong address**: if the caller sends a different `walletAddress` than the one the challenge was issued for, return `ADDRESS_MISMATCH` before touching the signature.
- **Invalid signature**: the nonce bytes are signed with the Stellar keypair. Verification uses `@stellar/stellar-sdk`'s `Keypair.verify()` which wraps Ed25519.
- **Store overflow**: challenge store is bounded (same `STORE_MAX_SIZE` pattern as wallet-link). Oldest entry evicted on overflow.

## Signature Convention

The client signs the raw nonce bytes (decoded from hex) with their Stellar private key using Ed25519. The signature is transmitted as a standard base64 string.

```ts
// Client-side (reference, not server code)
const keypair = Keypair.fromSecret(secretKey);
const nonceBytes = Buffer.from(nonce, "hex");
const signature = keypair.sign(nonceBytes).toString("base64");
```

The server verifies:
```ts
const keypair = Keypair.fromPublicKey(walletAddress);
const nonceBytes = Buffer.from(challenge.nonce, "hex");
const sigBytes = Buffer.from(signature, "base64");
const valid = keypair.verify(nonceBytes, sigBytes);
```

## Audit Events

| Event | Level | When |
|-------|-------|------|
| `CHALLENGE_ISSUE_ATTEMPT` | info | Issue endpoint called |
| `CHALLENGE_ISSUE_OK` | info | Challenge stored |
| `CHALLENGE_ISSUE_ERROR` | warn/error | Validation or internal failure |
| `CHALLENGE_VERIFY_ATTEMPT` | info | Verify endpoint called |
| `CHALLENGE_VERIFY_OK` | info | Signature valid, challenge consumed |
| `CHALLENGE_VERIFY_ERROR` | warn/error | Any failure path |

## Implementation Boundaries

- `src/challenge-verify.ts` — pure business logic (issueChallenge, verifyChallenge), no Express.
- `src/index.ts` — mounts the two routes, delegates to the service functions.
- `packages/types/src/index.ts` — `ChallengeRecord`, `ChallengeIssueInput/Result`, `ChallengeVerifyInput/Result`, `ChallengeErrorCode`.
- Tests in `src/challenge-verify.test.ts` cover happy path, all error codes, replay, expiry, and address mismatch.

## Tradeoffs

- **In-memory store**: consistent with wallet-link; fine for MVP. Production would use Redis with TTL.
- **No accountId binding at verify time**: the verify endpoint proves key ownership only. Binding to an accountId is a separate step (wallet link). This keeps the challenge flow reusable.
- **5-minute TTL**: long enough for slow mobile connections, short enough to limit replay windows.
