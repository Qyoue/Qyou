# Workspace Scripts — Phase 4

This document describes the Phase 4 hardening and contract enforcement for workspace scripts and package boundaries.

## Script contract

The Phase 4 contract (`workspace-scripts-contract-phase4.ts`) defines expected scripts for each workspace:

| Workspace | Required scripts | Optional scripts |
|-----------|-----------------|------------------|
| Root | build, dev, lint, typecheck, test | format, format:check |
| `@qyou/api` | build, dev, lint, typecheck, test | — |
| `@qyou/web` | build, dev, lint, typecheck, test | — |
| `@qyou/mobile` | dev, lint, typecheck | test, android, ios, web |
| `@qyou/shared` | build, lint, typecheck | — |
| `@qyou/stellar` | build, lint, typecheck | — |

## Validation rules

1. All required scripts must be declared in each workspace's `package.json`
2. All declared scripts must have a non-empty command
3. Workspace references in `-w` flags must be valid
4. Chain commands (`&&`) should be preceded by `set -e`
5. Each workspace should have a `tsconfig.json` with `compilerOptions` defined

## Hardening checks

The Phase 4 hardening script (`workspace-hardening-phase4.ts`) checks:

| Check | Severity | Description |
|-------|----------|-------------|
| Missing package.json | error | Workspace directory must contain package.json |
| Empty script commands | error | Every script declaration must have a command |
| Invalid workspace refs | warn | `-w` flag references unknown workspace |
| Missing `set -e` with `&&` | warn | Chain commands should start with `set -e` |
| CI-unfriendly test scripts | warn | Test scripts with `--watch` may hang in CI |
| Missing lint with build+test | warn | Workspace with build and test should have lint |

## Workflow

Run the Phase 4 workflow to validate all workspace scripts:

```bash
node scripts/workspace-scripts-workflow-phase4.ts
```

Run hardening:

```bash
node scripts/workspace-hardening-phase4.ts
```
