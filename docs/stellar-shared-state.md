# Shared state for kill switch, nonces, abuse counters and caps (#1139-#1142)

Code: `apps/api/src/shared/stellar/persistent-stores.ts`. It defines the stores against a small
`SharedKv` interface; it does **not** include a Redis adapter, and the existing in-memory classes
are unchanged and still the default until `bootstrap.ts` is switched over.

1. **Kill switch (#1139):** `SharedKillSwitchStorage` + `assertSharedStorage(storage, NODE_ENV)` at
   boot so production refuses `InMemory*`.
2. **Nonces (#1140):** `SharedNonceStore.consume` is consume-once across instances because the
   `used` marker is created with set-if-absent.
3. **Abuse counters (#1141):** `SharedSlidingCounter` uses bucketed counts for an approximate
   sliding window.
4. **Daily totals (#1142):** `PersistedDistributionGuard` reads sums from `Reward` rows
   (see `apps/api/prisma/stellar-persistence.prisma.md`), excluding `FAILED`.

Not done: the `SharedKv` Redis/DB adapter, wiring, and tests.
