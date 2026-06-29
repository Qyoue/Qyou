# Developer Documentation and Onboarding — Phase 3

This document describes the Phase 3 developer documentation and onboarding workflow for the Qyou monorepo.

## Required Documentation

Each workspace must maintain documentation files under its `docs/` directory:

| Workspace | Required Files |
|-----------|---------------|
| `@qyou/api` | `development.md`, `architecture.md`, `testing.md` |
| `@qyou/web` | `development.md`, `architecture.md`, `testing.md` |
| `@qyou/mobile` | `development.md`, `architecture.md` |
| `@qyou/shared` | `architecture.md` |
| `@qyou/stellar` | `architecture.md` |

## Documentation Standards

- Each file must have at least one `##` section header
- Files must be at least 200 characters in length
- Root-level documentation (`CONTRIBUTING.md`, `SETUP.md`, `TESTING.md`) must exist
- No markdown file should contain placeholder or TODO URLs

## Onboarding Process

New developers should follow these steps:

1. Clone repository and install dependencies (`npm ci`)
2. Read `CONTRIBUTING.md` for coding standards
3. Read `SETUP.md` for environment configuration
4. Read `TESTING.md` for test expectations
5. Build all workspaces (`npm run build`)
6. Run all tests (`npm run test`)

## Validation

Run the Phase 3 docs workflow:

```bash
node scripts/docs-workflow-phase3.ts
```
