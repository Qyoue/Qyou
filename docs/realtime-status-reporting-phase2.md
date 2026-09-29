# Phase 2 Real-Time Status & Wait-Time Reporting

This document details Phase 2 data model refinements and reporting calculation services for real-time wait-time tracking.

## Core Implementations

1. **Reporting Service**:
   - `apps/api/src/modules/queue/services/wait-time-reporting.service.ts`: `WaitTimeReportingService` calculating moving averages and confidence metrics.

2. **Web UI Reporting Card**:
   - `RealTimeWaitTimeCard`: React component displaying crowd-sourced wait times and confidence levels.

3. **Validation Schemas & Interfaces**:
   - `realTimeWaitReportSchema` and `waitTimeTrendSchema` defined in `@qyou/shared`.
