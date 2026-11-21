# Phase 3 Shared Auth Contracts & Schema Evolution Validation

This document outlines the Phase 3 validation guidelines for schema evolution, contract headers, and deprecation policies across the monorepo.

## Key Changes

1. **Header Validation**:
   - Implemented `contractEvolutionHeaderSchema` to enforce `x-contract-version` formatting and build tracking.
   - `validateContractHeader` utility in API auth validators checking header compliance.

2. **Web Client Integration**:
   - `apps/web/src/lib/contract-evolution-client.ts`: Formats and attaches strict contract headers to web HTTP requests.

3. **Contract Evolution Interfaces**:
   - Defined `ContractEvolutionHeader`, `SchemaDeprecationNotice`, and `ContractValidationResult` in `@qyou/shared`.
