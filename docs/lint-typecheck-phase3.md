# Lint, Typecheck, and Test — Phase 3

This document describes the Phase 3 behaviors and contracts for lint, typecheck, and test tooling.

## Workflow automation

The `lint-typecheck-workflow.ts` validates that every workspace has:

- A non-empty `lint` script
- A `typecheck` script (with `tsc --noEmit`)
- A `test` script (where applicable)
- An ESLint config file
- A `tsconfig.json`

## Contract summary

| Workspace | Lint | Typecheck | Test | ESLint Config | tsconfig |
|---|---|---|---|---|---|
| `@qyou/api` | eslint | tsc --noEmit | node:test | yes | yes |
| `@qyou/web` | eslint | tsc --noEmit | jest | yes | yes |
| `@qyou/mobile` | eslint | tsc --noEmit | jest | yes | yes |
| `@qyou/shared` | eslint | tsc --noEmit | — | yes | yes |
| `@qyou/stellar` | eslint | tsc --noEmit | — | yes | yes |

## Developer documentation contract (Phase 3)

The Phase 3 contract for developer documentation defines:

1. Every workspace must have a `docs/` directory
2. Required files: `development.md`, `architecture.md`, `testing.md`
3. Each file must meet minimum size requirements
4. Each file must contain expected section headers
5. Documentation must be validated as part of CI

## Documentation workflow

The `docs-workflow-phase3.ts` script validates:

- `docs/` directory exists
- Required doc files exist
- Each file meets minimum content size
- Expected sections are present
- No orphaned files in `docs/`

## CI integration

```yaml
- name: Validate lint/typecheck workflow
  run: npm run validate:lint-workflow
  
- name: Validate docs
  run: npm run docs-workflow-phase3:ci
```
