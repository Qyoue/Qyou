# Workspace Scripts

This document describes the workspace scripts defined across the Qyou monorepo and their intended behavior.

## Root scripts

| Script | Description |
|---|---|
| `build` | Builds `@qyou/shared` and `@qyou/stellar`, then runs build across all workspaces |
| `dev` | Starts all dev servers concurrently (api, web, mobile) |
| `lint` | Runs ESLint across all workspaces |
| `format` | Formats code with Prettier |
| `format:check` | Checks formatting without writing |
| `typecheck` | Runs TypeScript type checking across all workspaces |
| `test` | Runs tests across all workspaces |

## Workspace script boundaries

Each workspace declares scripts in its own `package.json`. The root `package.json` uses
`--workspaces --if-present` to delegate to individual workspaces.

### `@qyou/api`

| Script | Command |
|---|---|
| `build` | `tsc -p tsconfig.json` |
| `dev` | `tsx watch --clear-screen=false src/main.ts` |
| `lint` | `eslint .` |
| `typecheck` | `tsc -p tsconfig.json --noEmit` |
| `test` | `node --import tsx --test src/modules/auth/tests/*.test.ts` |

### `@qyou/web`

| Script | Command |
|---|---|
| `build` | `next build` |
| `dev` | `next dev` |
| `lint` | `eslint .` |
| `typecheck` | `tsc --noEmit` |
| `test` | `jest` |

### `@qyou/mobile`

| Script | Command |
|---|---|
| `dev` | `expo start` |
| `lint` | `eslint .` |
| `typecheck` | `tsc --noEmit` |
| `test` | `jest` |

### `@qyou/shared`

| Script | Command |
|---|---|
| `build` | `tsc -p tsconfig.json` |
| `lint` | `eslint .` |
| `typecheck` | `tsc -p tsconfig.json --noEmit` |

### `@qyou/stellar`

| Script | Command |
|---|---|
| `build` | `tsc -p tsconfig.json` |
| `lint` | `eslint .` |
| `typecheck` | `tsc -p tsconfig.json --noEmit` |

---

## Phase history

The phase notes below were merged from the separate phase documents (kept for history).

### From `workspace-scripts-phase3.md`

## Workspace Scripts — Phase 3

This document describes the Phase 3 hardening and documentation for workspace scripts and package boundaries.

### Script hardening

Each workspace script has been hardened against the following failure modes:

| Failure mode | Mitigation |
|---|---|
| Empty scripts | Validation checks that every declared script has a non-empty command |
| Unknown workspace references | Scripts using `-w` flags are checked against existing workspace names |
| Unhandled chained commands | Scripts using `&&` without `set -e` or `||` are flagged |

### Package boundary rules

- `@qyou/shared` must build before `@qyou/api`, `@qyou/web`, and `@qyou/stellar`
- `@qyou/stellar` must build before `@qyou/api`
- No workspace should import from a workspace at a higher build order
- Shared packages should not depend on app packages

### Best practices

1. Every script should have a single responsibility
2. Use `-w <workspace>` for workspace-specific commands
3. Use `--workspaces --if-present` for root-level delegation
4. Chain commands with `&&` only when all preceding commands must succeed
5. Prefer `npm ci` over `npm install` for deterministic installs

### Validation

```bash
npm run workspace-harden:ci    # Run workspace hardening checks
```

### From `workspace-scripts-phase4.md`

## Workspace Scripts — Phase 4

This document describes the Phase 4 hardening and contract enforcement for workspace scripts and package boundaries.

### Script contract

The Phase 4 contract (`workspace-scripts-contract-phase4.ts`) defines expected scripts for each workspace:

| Workspace | Required scripts | Optional scripts |
|-----------|-----------------|------------------|
| Root | build, dev, lint, typecheck, test | format, format:check |
| `@qyou/api` | build, dev, lint, typecheck, test | — |
| `@qyou/web` | build, dev, lint, typecheck, test | — |
| `@qyou/mobile` | dev, lint, typecheck | test, android, ios, web |
| `@qyou/shared` | build, lint, typecheck | — |
| `@qyou/stellar` | build, lint, typecheck | — |

### Validation rules

1. All required scripts must be declared in each workspace's `package.json`
2. All declared scripts must have a non-empty command
3. Workspace references in `-w` flags must be valid
4. Chain commands (`&&`) should be preceded by `set -e`
5. Each workspace should have a `tsconfig.json` with `compilerOptions` defined

### Hardening checks

The Phase 4 hardening script (`workspace-hardening-phase4.ts`) checks:

| Check | Severity | Description |
|-------|----------|-------------|
| Missing package.json | error | Workspace directory must contain package.json |
| Empty script commands | error | Every script declaration must have a command |
| Invalid workspace refs | warn | `-w` flag references unknown workspace |
| Missing `set -e` with `&&` | warn | Chain commands should start with `set -e` |
| CI-unfriendly test scripts | warn | Test scripts with `--watch` may hang in CI |
| Missing lint with build+test | warn | Workspace with build and test should have lint |

### Workflow

Run the Phase 4 workflow to validate all workspace scripts:

```bash
node scripts/workspace-scripts-workflow-phase4.ts
```

Run hardening:

```bash
node scripts/workspace-hardening-phase4.ts
```

### From `workspace-scripts-phase5.md`

## Workspace Scripts and Package Boundaries — Phase 5 Behavior

### Overview

The Phase 5 workspace scripts and package boundaries contract defines the expected
workspace structure, script dependencies, build ordering, and import boundary rules
across all workspaces in the Qyou monorepo.

### Contract Structure

The contract (`workspace-scripts-contract-phase5.ts`) exports:

- **`WorkspaceScriptsPhase5Contract`** — per-workspace contract type
- **`PHASE5_CONTRACTS`** — contract instances for all 5 workspaces
- **`getPhase5Contract(name)`** — lookup helper
- **`validatePhase5Contract(contract)`** — validation function

### Build Order

| Build Order | Workspace | Type |
|-------------|-----------|------|
| 1 | `@qyou/shared` | Shared package |
| 2 | `@qyou/stellar` | Shared package |
| 3 | `@qyou/api` | Application |
| 4 | `@qyou/web` | Application |
| 5 | `@qyou/mobile` | Application |

### Script Dependencies

#### @qyou/api
| Script | Depends On | Post-Build | Required Env Vars |
|--------|-----------|------------|-------------------|
| build | @qyou/shared | prisma:generate | DATABASE_URL, JWT_SECRET |
| test | build | — | — |
| dev | @qyou/shared | — | DATABASE_URL, JWT_SECRET |
| lint | — | — | — |
| typecheck | — | — | — |

#### @qyou/web
| Script | Depends On | Required Env Vars |
|--------|-----------|-------------------|
| build | @qyou/shared, @qyou/api | NEXT_PUBLIC_API_URL |
| test | build | — |
| dev | @qyou/shared | NEXT_PUBLIC_API_URL |
| lint | — | — |
| typecheck | — | — |

#### @qyou/mobile
| Script | Depends On |
|--------|-----------|
| dev | @qyou/shared |
| test | @qyou/shared |
| lint | — |
| typecheck | — |
| build | @qyou/shared |

#### @qyou/shared
| Script | Depends On |
|--------|-----------|
| build | — |
| lint | — |
| typecheck | — |

#### @qyou/stellar
| Script | Depends On |
|--------|-----------|
| build | @qyou/shared |
| lint | — |
| typecheck | — |

### Import Boundary Rules

| Workspace | Allowed Imports | Forbidden Imports |
|-----------|----------------|-------------------|
| @qyou/api | @qyou/shared, @qyou/stellar | @qyou/web, @qyou/mobile |
| @qyou/web | @qyou/shared | @qyou/stellar, @qyou/mobile, @qyou/api |
| @qyou/mobile | @qyou/shared | @qyou/stellar, @qyou/web, @qyou/api |
| @qyou/shared | — | @qyou/api, @qyou/web, @qyou/mobile, @qyou/stellar |
| @qyou/stellar | @qyou/shared | @qyou/api, @qyou/web, @qyou/mobile |

### Validation Rules

- Build order must be respected — no workspace may depend on a workspace with a higher build order
- Shared packages must build before application packages
- Shared packages must not depend on application packages
- Required env vars must be present in `.env.example`
- Forbidden imports must not appear in workspace `tsconfig.json` paths
- All required scripts must be declared in workspace `package.json`
