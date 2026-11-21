# Stellar API hardening (#1151-#1154)

Middleware: `apps/api/src/modules/stellar/routes/stellar-hardening.ts`. This change adds it
without editing `stellar.routes.ts` or `server.ts`, and without reading them.

## Wiring

```ts
router.use(featureGate(() => flags.stellarEnabled));            // #1151, 404 when off
router.post('/wallet/challenge', requireAuth, challengeLimit, issueChallenge);   // #1152
router.post('/wallet', requireAuth, linkLimit, requireVerifiedChallenge(verifier), linkWallet);
router.delete('/wallet', requireAuth, unlinkLimit, requireRecentAuth(5), unlinkWallet);
```

`challengeLimit`, `linkLimit`, `unlinkLimit` are separate `rateLimit({ windowMs, perUser, perIp })`
instances (#1153). `server.ts` must mount the router at both `/api/stellar` and
`/api/v1/stellar`; the flag test (disabled flag returns 404) is not included.

## Caveats

- `rateLimit` keeps counters in process memory, so limits are per instance until it is backed by
  the shared store from #1141.
- `requireVerifiedChallenge` needs a `ChallengeVerifier` backed by `WalletChallengeService` with a
  persisted, consume-once nonce (#1140). Replay and expiry tests are not included.
- `requireRecentAuth` reads `req.user.lastAuthAt`, which the auth middleware must set. The
  unlink handler must write the audit entry (`recordAuditLog`).
