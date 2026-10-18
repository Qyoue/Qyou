# Safe submission and retries (#1119-#1122)

Helpers live in `packages/stellar/src/client/safe-submit.ts`. This change adds them without
editing `horizon.client.ts` or `incentive_retry.ts`; those files still need to adopt them.

## Adoption checklist

1. **#1119 Horizon import.** In `horizon.client.ts` use `import { Horizon } from '@stellar/stellar-sdk'`
   and `new Horizon.Server(url)`. Pin `@stellar/stellar-sdk` to an exact version in
   `packages/stellar/package.json` and add a smoke test that imports `Horizon` and `rpc`.
2. **#1120 Timeout.** Replace `(server as any).axios.defaults.timeout` with
   `withTimeout((signal) => call(signal), ms)`, passing the signal to the HTTP client, or use the
   SDK's supported client options. Remove the `any` casts.
3. **#1121 Non-idempotent submission.** Wrap payment submission in `submitIdempotent`, supplying
   the signed transaction hash, `submit` and a `lookup` that calls `server.transactions().transaction(hash)`
   (404 -> `null`). Only `network`, `timeout` and `rate_limited` errors are retried.
   Required test: submit times out, ledger already has the hash, result is returned and `submit`
   ran once.
4. **#1122 Error type.** `IncentiveRetryHandler` should call `retryWithCause`, which rethrows the
   original error (so `StellarError` subclasses stay intact) and retries only retryable kinds.
   Give `StellarError` subclasses a `kind` so `classifyError` can use it.

## Not done here

No tests were added or run and the SDK was not pinned; both need the package manifest and test
setup that this change deliberately did not touch.
