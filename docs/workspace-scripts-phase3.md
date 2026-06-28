# Workspace Scripts — Phase 3

This document describes the Phase 3 hardening and documentation for workspace scripts and package boundaries.

## Script hardening

Each workspace script has been hardened against the following failure modes:

| Failure mode | Mitigation |
|---|---|
| Empty scripts | Validation checks that every declared script has a non-empty command |
| Unknown workspace references | Scripts using `-w` flags are checked against existing workspace names |
| Unhandled chained commands | Scripts using `&&` without `set -e` or `||` are flagged |

## Package boundary rules

- `@qyou/shared` must build before `@qyou/api`, `@qyou/web`, and `@qyou/stellar`
- `@qyou/stellar` must build before `@qyou/api`
- No workspace should import from a workspace at a higher build order
- Shared packages should not depend on app packages

## Best practices

1. Every script should have a single responsibility
2. Use `-w <workspace>` for workspace-specific commands
3. Use `--workspaces --if-present` for root-level delegation
4. Chain commands with `&&` only when all preceding commands must succeed
5. Prefer `npm ci` over `npm install` for deterministic installs

## Validation

```bash
npm run workspace-harden:ci    # Run workspace hardening checks
```
