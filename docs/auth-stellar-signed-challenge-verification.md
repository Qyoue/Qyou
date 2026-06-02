# AUTH-083..085 — Signed Challenge Verification (Hardening, Instrumentation, Verification)

This document describes how to exercise and verify the signed challenge verification flow in `@qyou/stellar-service`.

Backlog-IDs:
- AUTH-083 (Harden)
- AUTH-084 (Instrument)
- AUTH-085 (Verify)
- AUTH-080 (Verify wallet-link initiation contract)

## What to run

From the repo root:

```bash
npm test --workspace @qyou/stellar-service
```

This runs:
- `src/challenge-verify.test.ts` (signed challenge issue + verify flow)
- `src/wallet-link.test.ts` and `src/wallet-link-completion.test.ts` (wallet link initiation + completion contracts)

## Manual smoke test (optional)

1) Start the service:

```bash
npm run dev --workspace @qyou/stellar-service
```

2) Issue a challenge:

```bash
curl -sS -X POST http://localhost:4100/api/v1/stellar/challenge/issue \
  -H 'Content-Type: application/json' \
  -d '{ "walletAddress": "G..." }'
```

3) Sign the returned `nonce` with the Stellar private key for that public key (client-side), base64-encode the signature, then verify:

```bash
curl -sS -X POST http://localhost:4100/api/v1/stellar/challenge/verify \
  -H 'Content-Type: application/json' \
  -d '{ "challengeId": "<uuid>", "walletAddress": "G...", "signature": "<base64>" }'
```

## Operational notes

- Challenges are short-lived and single-use; replay attempts return `CHALLENGE_ALREADY_USED`.
- Issue and verify are rate-limited per wallet address to reduce abuse surface.
- Log events are structured JSON and include `challengeId` and `walletAddress` for high-signal debugging.

