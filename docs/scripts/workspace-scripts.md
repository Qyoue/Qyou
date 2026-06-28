# Workspace Scripts

This document describes the workspace-level scripts available in the Qyou monorepo and their
expected behavior.

## Validation scripts

### `npm run validate:workspaces`

Runs workspace boundary validation. Checks that every workspace package.json:
- Has required scripts (`typecheck`, `lint`, `test`; additionally `build` for packages)
- Follows the `@qyou/*` naming convention
- Uses `*` for internal workspace dependencies
- Has a `tsconfig.json` that extends `tsconfig.base.json` (unless it's a framework-specific config)

### `npm run validate:env`

Validates environment configuration across all workspaces. Checks that:
- Each `.env.example` file exists and is parseable
- Variables in `.env.example` are documented in `docs/SETUP.md`
- No placeholder values (`change-me`, empty strings) are used without notice
- No duplicate variable values across files

### `npm run validate:ci`

Runs CI pipeline contract tests. Ensures that CI workflow definitions include the required
steps (`typecheck`, `lint`, `test`, `build`) as defined by the pipeline contract in
`scripts/ci-pipeline-schema.ts`.

## Running scripts

```bash
# Run all validations
npm run validate:workspaces
npm run validate:env

# Run CI contract tests
npm run validate:ci
```

## CI integration

All validation scripts are designed to return a non-zero exit code on failure, making them
suitable for CI pipeline gates. Each script prints human-readable errors and warnings before
exiting.
