# Workspace Scripts and Package Boundaries — Phase 5 Behavior

## Overview

The Phase 5 workspace scripts and package boundaries contract defines the expected
workspace structure, script dependencies, build ordering, and import boundary rules
across all workspaces in the Qyou monorepo.

## Contract Structure

The contract (`workspace-scripts-contract-phase5.ts`) exports:

- **`WorkspaceScriptsPhase5Contract`** — per-workspace contract type
- **`PHASE5_CONTRACTS`** — contract instances for all 5 workspaces
- **`getPhase5Contract(name)`** — lookup helper
- **`validatePhase5Contract(contract)`** — validation function

## Build Order

| Build Order | Workspace | Type |
|-------------|-----------|------|
| 1 | `@qyou/shared` | Shared package |
| 2 | `@qyou/stellar` | Shared package |
| 3 | `@qyou/api` | Application |
| 4 | `@qyou/web` | Application |
| 5 | `@qyou/mobile` | Application |

## Script Dependencies

### @qyou/api
| Script | Depends On | Post-Build | Required Env Vars |
|--------|-----------|------------|-------------------|
| build | @qyou/shared | prisma:generate | DATABASE_URL, JWT_SECRET |
| test | build | — | — |
| dev | @qyou/shared | — | DATABASE_URL, JWT_SECRET |
| lint | — | — | — |
| typecheck | — | — | — |

### @qyou/web
| Script | Depends On | Required Env Vars |
|--------|-----------|-------------------|
| build | @qyou/shared, @qyou/api | NEXT_PUBLIC_API_URL |
| test | build | — |
| dev | @qyou/shared | NEXT_PUBLIC_API_URL |
| lint | — | — |
| typecheck | — | — |

### @qyou/mobile
| Script | Depends On |
|--------|-----------|
| dev | @qyou/shared |
| test | @qyou/shared |
| lint | — |
| typecheck | — |
| build | @qyou/shared |

### @qyou/shared
| Script | Depends On |
|--------|-----------|
| build | — |
| lint | — |
| typecheck | — |

### @qyou/stellar
| Script | Depends On |
|--------|-----------|
| build | @qyou/shared |
| lint | — |
| typecheck | — |

## Import Boundary Rules

| Workspace | Allowed Imports | Forbidden Imports |
|-----------|----------------|-------------------|
| @qyou/api | @qyou/shared, @qyou/stellar | @qyou/web, @qyou/mobile |
| @qyou/web | @qyou/shared | @qyou/stellar, @qyou/mobile, @qyou/api |
| @qyou/mobile | @qyou/shared | @qyou/stellar, @qyou/web, @qyou/api |
| @qyou/shared | — | @qyou/api, @qyou/web, @qyou/mobile, @qyou/stellar |
| @qyou/stellar | @qyou/shared | @qyou/api, @qyou/web, @qyou/mobile |

## Validation Rules

- Build order must be respected — no workspace may depend on a workspace with a higher build order
- Shared packages must build before application packages
- Shared packages must not depend on application packages
- Required env vars must be present in `.env.example`
- Forbidden imports must not appear in workspace `tsconfig.json` paths
- All required scripts must be declared in workspace `package.json`
