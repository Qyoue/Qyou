# CI Pipeline — Phase 3

This document describes the Phase 3 behavior, hardening, and testing for the CI pipeline.

## Workflow validation

The `ci-pipeline-workflow-phase3.ts` validates every workflow file:

- Required YAML keys exist (`name`, `on`, `jobs`, `runs-on`, `steps`)
- Expected steps are present (install, lint, test, build)
- Install step must precede lint step

## Hardening checks

The `ci-pipeline-hardening-phase3.ts` validates:

- No deprecated `::set-output` syntax
- All GitHub Actions are pinned to specific versions
- `timeout-minutes` is set for each job
- Explicit `shell:` is set for each job
- Uses `npm ci` instead of `npm install`

## Test coverage

The `ci-pipeline-phase3.test.ts` covers:

- `checkContentHas` for string detection in workflow content
- `checkInstallBeforeLint` for step ordering validation
- `checkNoNpmInstall` for detecting `npm install` usage

## CI pipeline contract summary

| Rule | Required | Enforced by |
|---|---|---|
| Pinned action versions | Yes | `ci-pipeline-hardening-phase3.ts` |
| `timeout-minutes` set | Yes | `ci-pipeline-hardening-phase3.ts` |
| `npm ci` not `npm install` | Yes | `ci-pipeline-hardening-phase3.ts` |
| Install before lint | Yes | `ci-pipeline-workflow-phase3.ts` |
| Required steps present | Yes | `ci-pipeline-workflow-phase3.ts` |
| No deprecated syntax | Yes | `ci-pipeline-hardening-phase3.ts` |
