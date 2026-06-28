# Developer Documentation Workflow

This document defines the workflow for maintaining developer documentation in the Qyou monorepo.

## Required docs

Every workspace should include a `docs/` directory with:

| File | Purpose | Required |
|---|---|---|
| `docs/development.md` | How to set up and run the workspace | Yes |
| `docs/architecture.md` | High-level architecture overview | Yes |
| `docs/testing.md` | Testing strategy and common patterns | Yes |
| `docs/deployment.md` | Deployment instructions and environments | No |

## Validation process

The `validate-docs.ts` script scans each workspace directory and checks for the required
documentation files. It reports:

- Missing required docs (fails the check)
- Workspaces missing a `docs/` directory entirely (fails the check)
- Optional docs that are missing (warning only)

## CI integration

The doc validation runs as part of the linting phase in CI:

```yaml
- name: Validate docs
  run: npm run validate:docs
```

If required docs are missing, the workflow fails with clear error messages listing
exactly which files are missing in which workspaces.

## Adding a new workspace

When adding a new workspace, create at minimum these documentation files:

1. `docs/development.md` — setup instructions
2. `docs/architecture.md` — how it works
3. `docs/testing.md` — how to test

Run `npm run validate:docs` to verify everything is in order.
