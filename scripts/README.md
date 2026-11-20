# Scripts

Ownership map for everything in `scripts/` (#1386). Files named `*-phaseN.*` are earlier iterations of the same check as the unnumbered file in their group; the **base** file is the one to extend, and the phase files are kept only until their tests are folded into it. Do not add new `*-phaseN` files.

Each script has a test of the same name in `scripts/__tests__/` where one exists. `scripts/__tests__/scripts-inventory.test.ts` fails when a script is added without being listed here.

## Account safety


  Phase files (consolidation candidates):
  - `account-safety-contract-phase5.ts`

## CI pipeline

- `ci-health-check.ts`
- `ci-pipeline-contract.ts`
- `ci-pipeline-hardening.ts`
- `ci-pipeline-schema.ts`
- `ci-pipeline-workflow.ts`

  Phase files (consolidation candidates):
  - `ci-pipeline-contract-phase3.ts`
  - `ci-pipeline-contract-phase4.ts`
  - `ci-pipeline-contract-phase5.ts`
  - `ci-pipeline-hardening-phase3.ts`
  - `ci-pipeline-hardening-phase4.ts`
  - `ci-pipeline-hardening-phase5.ts`
  - `ci-pipeline-workflow-phase3.ts`
  - `ci-pipeline-workflow-phase4.ts`
  - `ci-pipeline-workflow-phase5.ts`

## Deploy and smoke

- `deploy-testnet-verify.ts`
- `post-deploy-smoke-test.ts`
- `productionReadinessGate.ts`
- `runQuickstartSuite.sh`

## Documentation

- `docs-contract.ts`
- `docs-hardening.ts`
- `docs-health-check.ts`
- `docs-workflow.ts`
- `validate-docs.ts`

  Phase files (consolidation candidates):
  - `docs-contract-phase1.ts`
  - `docs-contract-phase3.ts`
  - `docs-hardening-phase3.ts`
  - `docs-hardening-phase4.ts`
  - `docs-onboarding-contract-phase4.ts`
  - `docs-onboarding-contract-phase5.ts`
  - `docs-onboarding-hardening-phase5.ts`
  - `docs-onboarding-workflow-phase5.ts`
  - `docs-workflow-phase3.ts`
  - `docs-workflow-phase4.ts`

## Environment and secrets

- `check-env-workflow.ts`
- `env-config-contract.ts`
- `env-config-hardening.ts`
- `env-contract.ts`
- `env-secret-workflow.ts`
- `validate-env.ts`

  Phase files (consolidation candidates):
  - `env-config-contract-phase3.ts`
  - `env-config-workflow-phase3.ts`
  - `env-secret-contract-phase4.ts`
  - `env-secret-contract-phase5.ts`
  - `env-secret-hardening-phase3.ts`
  - `env-secret-hardening-phase4.ts`
  - `env-secret-hardening-phase5.ts`
  - `env-secret-workflow-phase4.ts`
  - `env-secret-workflow-phase5.ts`

## Lint and typecheck

- `lint-typecheck-contract.ts`
- `lint-typecheck-ergonomics.ts`
- `lint-typecheck-hardening.ts`
- `lint-typecheck-test-contract.ts`
- `lint-typecheck-workflow.ts`

  Phase files (consolidation candidates):
  - `lint-typecheck-contract-phase3.ts`
  - `lint-typecheck-contract-phase4.ts`
  - `lint-typecheck-harden-phase1.ts`
  - `lint-typecheck-hardening-phase3.ts`
  - `lint-typecheck-hardening-phase4.ts`
  - `lint-typecheck-test-contract-phase5.ts`
  - `lint-typecheck-test-hardening-phase5.ts`
  - `lint-typecheck-test-workflow-phase5.ts`
  - `lint-typecheck-workflow-phase3.ts`
  - `lint-typecheck-workflow-phase4.ts`

## Other

- `client-openapi-contract.ts`

## Queue contracts


  Phase files (consolidation candidates):
  - `queue-membership-phase2-contract.ts`
  - `queue-models-persistence-contract-phase1.ts`
  - `queue-realtime-status-contract-phase1.ts`
  - `web-auth-queue-observability-phase5.ts`

## Session lifecycle


  Phase files (consolidation candidates):
  - `session-lifecycle-contract-phase5.ts`

## Web auth


  Phase files (consolidation candidates):
  - `web-auth-ux-contract-phase4.ts`

## Workspace layout and scripts

- `validate-workspaces.ts`
- `workspace-boundary-check.ts`
- `workspace-boundary-contract.ts`
- `workspace-schema.ts`
- `workspace-workflow.ts`

  Phase files (consolidation candidates):
  - `workspace-hardening-phase3.ts`
  - `workspace-hardening-phase4.ts`
  - `workspace-hardening-phase5.ts`
  - `workspace-scripts-contract-phase3.ts`
  - `workspace-scripts-contract-phase4.ts`
  - `workspace-scripts-contract-phase5.ts`
  - `workspace-scripts-workflow-phase3.ts`
  - `workspace-scripts-workflow-phase4.ts`
  - `workspace-scripts-workflow-phase5.ts`

