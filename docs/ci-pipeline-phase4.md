# CI Pipeline Stability and Reproducibility — Phase 4

This document describes the Phase 4 stability and reproducibility requirements for all CI workflows.

## Workflow Contracts

| Workflow | Jobs | Expected Duration | Caching |
|----------|------|-------------------|---------|
| `backend.yml` | 5 | 12 min | node_modules, .npm |
| `web.yml` | 5 | 15 min | node_modules, .npm, .next/cache |
| `mobile.yml` | 4 | 20 min | node_modules, .npm |
| `packages.yml` | 4 | 10 min | node_modules, .npm |

## Reproducibility Requirements

| Requirement | Value |
|-------------|-------|
| Lock file | Required (package-lock.json) |
| Node version | Pinned to 20.x |
| OS image | ubuntu-22.04 |
| Hash verification | Required for cache keys |

## Caching Strategy

- All workflows cache `node_modules` and `.npm`
- `web.yml` additionally caches `.next/cache`
- Cache key uses `hashFiles('package-lock.json')`

## Stability Configuration

- Each job has a timeout-minutes configured
- `npm ci` is used instead of `npm install`
- Actions are pinned to major versions (checkout@v4, setup-node@v4)

## Validation

Run the Phase 4 CI pipeline workflow:

```bash
node scripts/ci-pipeline-workflow-phase4.ts
```

Run hardening checks:

```bash
node scripts/ci-pipeline-hardening-phase4.ts
```
