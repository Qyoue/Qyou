# Phase 1 Operator Controls & Queue Moderation

This document specifies Phase 1 operator-facing moderation controls, queue pause/resume mechanisms, and audit logging.

## Core Features

1. **Moderation Service & Logging**:
   - `apps/api/src/modules/queue/services/queue-moderation.service.ts`: `QueueModerationService` recording operator actions with ISO timestamps.

2. **Web Operator Bar**:
   - `QueueModerationBar`: React control toolbar supporting pause, resume, and reporting actions.

3. **Shared Schemas & Interfaces**:
   - Defined `QueueModerationRecord`, `ModerationAction`, `queueModerationSchema` in `@qyou/shared`.
