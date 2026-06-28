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
