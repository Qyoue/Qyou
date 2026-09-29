# Phase 2 Shared Auth Contracts — End-to-End Coverage

This document specifies the end-to-end coverage expected for Phase 2 shared auth contracts, so a
contract change cannot land green while breaking a consumer.

## Architectural Guidelines

1. **Contract tests belong with the contract**:
   - `packages/shared/src/validation/auth.schemas.ts`: each schema is exercised directly with both a
     valid and an invalid payload, independent of any app.

2. **Service and route coverage**:
   - `apps/api/src/modules/auth/tests/auth.service.test.ts`: service behaviour against the shared
     schemas.
   - `apps/api/src/modules/auth/tests/auth.routes.test.ts`: the same payloads driven through the
     route, confirming the error shape survives transport.

3. **Web integration**:
   - `apps/web/src/lib/api-client.ts` and `auth-context.tsx` are covered against a response built
     from the shared types, so the client cannot assume a field the contract does not promise.

## Coverage Matrix

| Layer | Valid payload | Invalid payload | Error shape |
|---|---|---|---|
| `@qyou/shared` schema | ✔ | ✔ | n/a |
| API service | ✔ | ✔ | ✔ |
| API route | ✔ | ✔ | ✔ |
| Web client | ✔ | ✔ | ✔ |

## Rule

A contract change is only complete when the same payload has been asserted at every row above.
Testing the schema alone proves the rule exists, not that anyone applies it.
