# Phase 1 Shared Queue Models & API Operational Contract

This document specifies the operational contract for shared queue data models, API payload envelopes, and standardized error formats across `@qyou/shared`, `apps/api`, and `apps/web`.

## Operational Specifications

1. **API Envelope Format**:
   - `QueueApiEnvelope<T>`: Standardized response wrapper containing `success: boolean`, `data?: T`, and `error?: QueueErrorPayload`.
   - `PaginationMeta`: Standardized page numbers, total counts, and limit metadata.

2. **Error Taxonomy & Standard Codes**:
   - `QUEUE_NOT_FOUND`, `QUEUE_FULL`, `DUPLICATE_MEMBERSHIP`, `UNAUTHORIZED_OPERATOR`.

3. **Validation & Type Exports**:
   - Zod schemas `queueApiEnvelopeSchema` and `paginationParamsSchema` exported from `@qyou/shared`.
