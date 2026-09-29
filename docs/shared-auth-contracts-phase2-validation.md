# Phase 2 Shared Auth Contracts Validation

This document records how validation is tightened for Phase 2 shared auth contracts and schema
evolution, without duplicating rules across the workspace.

## Architectural Guidelines

1. **Schemas are the rule**:
   - `packages/shared/src/validation/auth.schemas.ts`: tightening means narrowing an existing schema
     — required fields, bounded lengths, explicit enums — not adding a second check elsewhere.

2. **Types follow schemas**:
   - `packages/shared/src/types/auth.types.ts`: types are derived from the schemas so a narrowed
     schema produces a compile error in any consumer that relied on the looser shape.

3. **Consumers enforce, they do not redefine**:
   - `apps/api/src/modules/auth/services/auth.service.ts` and
     `apps/api/src/modules/auth/routes/auth.routes.ts` parse with the shared schema.
   - `apps/web/src/lib/api-client.ts` uses the shared types for the same request bodies.

## Schema Evolution Rules

- **Narrowing is a breaking change.** Tightening a field that consumers already send requires the
  API to ship first, per the Phase 2 rollout sequence.
- **Additive fields are optional first.** A new required field breaks existing clients; introduce it
  as optional, migrate consumers, then require it.
- **Never fork a schema to work around a consumer.** A second schema is drift with extra steps.

## Verification

`npm run typecheck` at the root fails on any consumer left behind by a narrowed schema, which is the
intended signal — not something to suppress with a cast.
