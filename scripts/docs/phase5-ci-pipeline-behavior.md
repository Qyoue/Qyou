# CI Pipeline Stability and Reproducibility — Phase 5 Behavior

## Overview

The Phase 5 CI pipeline stability and reproducibility contract defines the
expected CI workflow structure, caching strategy, reproducibility guarantees,
and stability requirements for all GitHub Actions workflows.

## Contract Structure

The contract (`ci-pipeline-contract-phase5.ts`) exports:

- **`CiPipelinePhase5Contract`** — per-workflow contract type
- **`CI_PIPELINE_PHASE5_CONTRACTS`** — contract instances for all 4 workflows
- **`getCiPipelinePhase5Contract(fileName)`** — lookup helper
- **`validateCiPipelinePhase5(contract)`** — validation function

## Workflow Contracts

| Workflow | Jobs | Expected Duration | Retries |
|----------|------|-------------------|---------|
| `backend.yml` | 5 | 12 min | 1 |
| `web.yml` | 4 | 15 min | 1 |
| `mobile.yml` | 4 | 20 min | 2 |
| `packages.yml` | 4 | 10 min | 1 |

## Job Definitions

### backend.yml
1. **install** — actions/checkout@v4, actions/setup-node@v4, npm ci (5 min, cache: npm-hash)
2. **lint** — npm run lint (3 min)
3. **typecheck** — npm run typecheck (3 min)
4. **test** — npm run test (5 min, 1 retry)
5. **build** — npm run build (5 min, 1 retry)

### web.yml
1. **install** — checkout, setup-node, npm ci (5 min, cache: npm-hash)
2. **lint** — npm run lint (3 min)
3. **test** — npm run test (5 min, 1 retry)
4. **build** — next build (10 min, 1 retry, cache: .next/cache)

### mobile.yml
1. **install** — checkout, setup-node, npm ci (5 min, cache: npm-hash)
2. **lint** — npm run lint (3 min)
3. **test** — npm run test (10 min, 1 retry)
4. **build** — npm run build (15 min, 2 retries)

### packages.yml
1. **install** — checkout, setup-node, npm ci (5 min, cache: npm-hash)
2. **build** — npm run build (5 min)
3. **lint** — npm run lint (3 min)
4. **test** — npm run test (5 min, optional, continue on failure)

## Reproducibility Requirements

| Requirement | Value |
|-------------|-------|
| Lock file | Required (package-lock.json) |
| Node version | Pinned (20.x) |
| OS image | ubuntu-22.04 |
| Hash verification | Required |

## Caching Strategy

- **Enabled**: Yes
- **Key strategy**: Lockfile hash (`npm-${{ hashFiles('package-lock.json') }}`)
- **Paths**:
  - `node_modules` (all workflows)
  - `.npm` (all workflows)
  - `.next/cache` (web.yml only)

## Stability Configuration

- **Expected duration**: Per-workflow estimate (10–20 min)
- **Flake detection**: Enabled on all except packages.yml
- **Max retries**: 0–2 per job based on flakiness history
- **Notifications**: Slack (backend, web, mobile), Email (packages)

## Post-Steps

- backend.yml: upload-test-results, upload-build-artifacts
- web.yml: upload-test-results, upload-build-artifacts
- mobile.yml: upload-test-results
- packages.yml: upload-test-results

## Validation Rules

- Lock file must be required
- Hash verification must be enabled
- Caching must be enabled with at least one path
- Total job time must be at least 5 minutes
- At least one required job must be defined
