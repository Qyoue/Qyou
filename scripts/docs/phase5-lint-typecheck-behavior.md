# Lint, Typecheck, and Test Ergonomics — Phase 5 Behavior

## Overview

The Phase 5 lint, typecheck, and test ergonomics contract defines the expected
TypeScript configuration strictness, lint rules, pre-commit hooks, CI integration,
and IDE setup for all workspaces in the Qyou monorepo.

## Contract Structure

The contract (`lint-typecheck-test-contract-phase5.ts`) exports:

- **`LintTypecheckTestPhase5Ergonomics`** — per-workspace contract type
- **`LINT_TYPECHECK_TEST_PHASE5_CONTRACTS`** — contract instances for all 5 workspaces
- **`getLintTypecheckTestPhase5Contract(name)`** — lookup helper
- **`validateLintErgonomicsPhase5(contract)`** — validation function

## TypeScript Strict Rules

Six compiler options are required across all workspaces:

| Rule | Severity | Description |
|------|----------|-------------|
| `strict` | error | Enable all strict type checking |
| `noUnusedLocals` | error | Report unused local variables |
| `noUnusedParameters` | error | Report unused function parameters |
| `strictNullChecks` | error | Ensure null/undefined handling |
| `exactOptionalPropertyTypes` | warn | Treat optional properties strictly |
| `noImplicitOverride` | error | Require override keyword |

## ESLint Rules

| Rule | Severity | Description |
|------|----------|-------------|
| `@typescript-eslint/no-unused-vars` | error | No unused variables |
| `@typescript-eslint/no-explicit-any` | warn | Avoid any type |
| `no-console` | warn | No console.log in production |
| `@typescript-eslint/prefer-readonly` | warn | Prefer readonly properties |

## Pre-commit Hooks

Pre-commit hooks are required for all workspaces:

| Workspace | Hooks | Max Staged Lines |
|-----------|-------|-----------------|
| `@qyou/api` | lint-staged, typecheck, test:changed | 500 |
| `@qyou/web` | lint-staged, typecheck | 500 |
| `@qyou/mobile` | lint-staged, typecheck | 500 |
| `@qyou/shared` | typecheck | 300 |
| `@qyou/stellar` | typecheck, test | 300 |

## CI Integration

| Workspace | Fail on Lint | Fail on Type | Run Tests | Parallel | Timeout |
|-----------|-------------|-------------|-----------|----------|---------|
| `@qyou/api` | yes | yes | yes | yes | 10 min |
| `@qyou/web` | yes | yes | yes | yes | 10 min |
| `@qyou/mobile` | yes | yes | yes | no | 15 min |
| `@qyou/shared` | yes | yes | yes | yes | 5 min |
| `@qyou/stellar` | no | yes | yes | yes | 10 min |

## Test Framework Configuration

| Workspace | Runner | Coverage Threshold | Watch Mode |
|-----------|--------|-------------------|------------|
| `@qyou/api` | node --test | 80% | yes |
| `@qyou/web` | jest | 70% | yes |
| `@qyou/mobile` | jest | 60% | no |
| `@qyou/shared` | node --test | 90% | yes |
| `@qyou/stellar` | node --test | 75% | no |

## IDE Recommendations

Recommended VS Code extensions per workspace:

- **API/Web/Shared**: dbaeumer.vscode-eslint, orta.vscode-jest
- **Mobile**: dbaeumer.vscode-eslint, expo.vscode-expo-tools
- **Stellar**: stellar.stellar-vscode

## Validation Rules

- Minimum 4 error-severity rules required
- Pre-commit hooks must be enabled
- CI timeout must be at least 5 minutes
- Coverage threshold must be at least 50%
