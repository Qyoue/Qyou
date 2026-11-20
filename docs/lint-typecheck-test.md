# Lint, Typecheck, and Test Ergonomics

This document describes the ergonomic setup for running lint, typecheck, and test across the Qyou monorepo.

## Quick commands

```bash
# Run all checks across every workspace
npm run lint
npm run typecheck
npm run test

# Single workspace
npm run lint -w @qyou/api
npm run typecheck -w @qyou/web
npm run test -w @qyou/mobile
```

## Per-workspace tooling

| Workspace | Linter | Type checker | Test runner | Config files |
|---|---|---|---|---|
| `@qyou/api` | ESLint | tsc | node:test | `eslint.config.mjs`, `tsconfig.json` |
| `@qyou/web` | ESLint | tsc | Jest | `eslint.config.mjs`, `tsconfig.json` |
| `@qyou/mobile` | ESLint | tsc | Jest | `eslint.config.mjs`, `tsconfig.json` |
| `@qyou/shared` | ESLint | tsc | — | `eslint.config.mjs`, `tsconfig.json` |
| `@qyou/stellar` | ESLint | tsc | — | `eslint.config.mjs`, `tsconfig.json` |

## Ergonomics

### Root-level shortcuts

The root `package.json` provides `--workspaces --if-present` delegation:

```
npm run lint   → runs eslint in every workspace that declares a "lint" script
npm run typecheck → runs tsc --noEmit in every workspace that declares a "typecheck" script
npm run test   → runs tests in every workspace that declares a "test" script
```

### Workspace-level conventions

- Every workspace **must** declare a `lint` script.
- Workspaces with runtime code (`api`, `web`, `mobile`) **must** declare `typecheck` and `test`.
- Shared packages (`shared`, `stellar`) should declare `typecheck` and `lint` but may omit `test`.

### Failure handling

- All lint/typecheck/test scripts run sequentially within each workspace.
- A failure in one workspace blocks subsequent workspaces (root `--workspaces --if-present` behavior).
- For CI, each workspace gets its own workflow job for parallel execution.

## Hardening

The `lint-typecheck-hardening.ts` script performs these checks:

- Verifies `tsconfig.json` exists for each workspace
- Verifies at least one ESLint config file exists
- Validates that lint/typecheck/test scripts are non-empty
- Checks for valid JSON in `package.json`

---

## Phase history

The phase notes below were merged from the separate phase documents (kept for history).

### From `lint-typecheck-phase1.md`

## Lint, Typecheck, and Test — Phase 1

This document describes the Phase 1 behavior of lint, typecheck, and test ergonomics in the Qyou monorepo.

### Overview

Every workspace in the monorepo should declare three standard npm scripts:

- `lint` — Run ESLint
- `typecheck` — Run TypeScript type checking (`tsc --noEmit`)
- `test` — Run the workspace test suite

These scripts are invoked from the root via `--workspaces --if-present`, allowing
`npm run lint` to cascade across all workspaces.

### Workspace requirements

| Workspace | lint | typecheck | test | Test framework | ESLint | tsconfig |
|---|---|---|---|---|---|---|
| `@qyou/api` | ✅ | ✅ | ✅ | node:test | ✅ | ✅ |
| `@qyou/web` | ✅ | ✅ | ✅ | jest | ✅ | ✅ |
| `@qyou/mobile` | ✅ | ✅ | ✅ | jest | ✅ | ✅ |
| `@qyou/shared` | ✅ | ✅ | ❌ | — | ✅ | ✅ |
| `@qyou/stellar` | ✅ | ✅ | ❌ | — | ✅ | ✅ |

### Hardening rules

1. No script should be empty
2. No script should swallow errors (`|| true`, `|| exit 0`)
3. Test scripts must not use `--watch` (hangs in CI)
4. Each workspace must have ESLint config and `tsconfig.json`

### Developer documentation contract

The Phase 1 contract for developer documentation defines:

- Every workspace must have a `docs/` directory
- Required files: `development.md`, `architecture.md`, `testing.md`
- Documentation must be validated in CI

### Local verification

```bash
npm run typecheck
npm run lint
npm run test
```

### From `lint-typecheck-phase3.md`

## Lint, Typecheck, and Test — Phase 3

This document describes the Phase 3 behaviors and contracts for lint, typecheck, and test tooling.

### Workflow automation

The `lint-typecheck-workflow.ts` validates that every workspace has:

- A non-empty `lint` script
- A `typecheck` script (with `tsc --noEmit`)
- A `test` script (where applicable)
- An ESLint config file
- A `tsconfig.json`

### Contract summary

| Workspace | Lint | Typecheck | Test | ESLint Config | tsconfig |
|---|---|---|---|---|---|
| `@qyou/api` | eslint | tsc --noEmit | node:test | yes | yes |
| `@qyou/web` | eslint | tsc --noEmit | jest | yes | yes |
| `@qyou/mobile` | eslint | tsc --noEmit | jest | yes | yes |
| `@qyou/shared` | eslint | tsc --noEmit | — | yes | yes |
| `@qyou/stellar` | eslint | tsc --noEmit | — | yes | yes |

### Developer documentation contract (Phase 3)

The Phase 3 contract for developer documentation defines:

1. Every workspace must have a `docs/` directory
2. Required files: `development.md`, `architecture.md`, `testing.md`
3. Each file must meet minimum size requirements
4. Each file must contain expected section headers
5. Documentation must be validated as part of CI

### Documentation workflow

The `docs-workflow-phase3.ts` script validates:

- `docs/` directory exists
- Required doc files exist
- Each file meets minimum content size
- Expected sections are present
- No orphaned files in `docs/`

### CI integration

```yaml
- name: Validate lint/typecheck workflow
  run: npm run validate:lint-workflow
  
- name: Validate docs
  run: npm run docs-workflow-phase3:ci
```

### From `lint-typecheck-phase4.md`

## Lint, Typecheck, and Test Ergonomics — Phase 4

This document describes the Phase 4 ergonomics improvements for lint, typecheck, and test workflows.

### TypeScript Configuration

All workspaces are expected to enable strict mode and related compiler options:

| Option | Required | Description |
|--------|----------|-------------|
| `strict` | true | Enable all strict type checking |
| `noUnusedLocals` | true | Report unused local variables |
| `noUnusedParameters` | true | Report unused function parameters |
| `strictNullChecks` | true | Ensure null/undefined handling |
| `exactOptionalPropertyTypes` | true (api) | Treat optional properties strictly |
| `noImplicitOverride` | true | Require override keyword |

### ESLint Rules

Each workspace defines a set of required ESLint rules:

| Rule | Severity | Description |
|------|----------|-------------|
| `@typescript-eslint/no-unused-vars` | error | No unused variables |
| `@typescript-eslint/no-explicit-any` | warn | Avoid any type |
| `no-console` | warn | No console.log in production |

### Pre-commit Hooks

Pre-commit hooks are configured per workspace:

| Workspace | Hooks |
|-----------|-------|
| `@qyou/api` | lint, typecheck, test |
| `@qyou/web` | lint, typecheck |
| `@qyou/mobile` | lint, typecheck |
| `@qyou/shared` | typecheck |
| `@qyou/stellar` | typecheck |

### CI Integration

| Workspace | Lint | Typecheck | Test | Timeout |
|-----------|------|-----------|------|---------|
| `@qyou/api` | yes | yes | yes | 10 min |
| `@qyou/web` | yes | yes | yes | 15 min |
| `@qyou/mobile` | yes | yes | yes | 15 min |
| `@qyou/shared` | yes | yes | no | 5 min |
| `@qyou/stellar` | yes | yes | no | 5 min |

### Validation

Run the Phase 4 lint/typecheck workflow:

```bash
node scripts/lint-typecheck-workflow-phase4.ts
```

Run hardening checks:

```bash
node scripts/lint-typecheck-hardening-phase4.ts
```
