# Phase 1 Queue Domain Core Data Model & Discovery

This document details Phase 1 data modeling specifications for queue discovery, filtering, and wait-time reporting.

## Model & Architecture

1. **Shared Types & Validation**:
   - `QueueItem`, `LocationCoordinates`, and `QueueFilterParams` interfaces defined in `@qyou/shared`.
   - Zod schemas `queueFilterSchema` and `createQueueSchema` for input validation.

2. **Persistence Repository**:
   - `apps/api/src/modules/queue/repositories/in-memory-queue.repository.ts`: Repository implementing in-memory discovery, filtering, and search.

3. **Web Search UI Component**:
   - `QueueFilterBar`: React UI component for interactive queue filtering and search queries.
