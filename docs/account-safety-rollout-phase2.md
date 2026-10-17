# Account Safety, Password & Email Rollout Plan (Phase 2)

This document outlines the Phase 2 rollout specifications for account security policies, email change verification procedures, and lockout protections.

## Key Focus Areas

1. **Lockout Evaluation & Rate Limiting**:
   - Implemented `AccountSafetyService` to track consecutive authentication failures.
   - Configured temporary 15-minute account lockouts following 5 failed password attempts.

2. **Shared Safety Contracts**:
   - `EmailChangeRequest` and `AccountLockoutStatus` interfaces for contract safety between API and Web clients.
   - Zod validation via `emailChangeSchema` and `accountUnlockSchema`.

3. **Frontend UI Components**:
   - Introduced `AccountSafetyNotice` component in `apps/web/src/components` for displaying security warnings and policy alerts.
