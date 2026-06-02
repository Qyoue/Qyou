# AUTH-109/110 — Shared Auth Types & Request Contracts

This document describes how auth request/response contracts are shared across the monorepo and how to exercise the baseline to prevent drift.

Backlog-IDs:
- AUTH-109 (exercise)
- AUTH-110 (document)

## Goal

Define auth DTOs once and import them everywhere so workspaces do not re-describe the same shapes repeatedly.

Source of truth:
- `packages/types/src/index.ts`

## Conventions

- `*Input` types model endpoint request bodies.
- `*Result` types are unions of success and failure outcomes.
- Failure cases use a typed `code` union per domain (e.g., `LoginErrorCode`).

## Exercise the baseline (drift checks)

Run:

```bash
npm run auth:contracts
```

This:
- builds `@qyou/types` (ensures the contract layer typechecks)
- scans the repo for duplicate auth contract declarations outside `packages/types`

If it fails, delete the duplicate local contract type and import from `@qyou/types`.

