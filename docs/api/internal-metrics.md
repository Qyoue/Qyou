# Internal Metrics Endpoint

## Overview

`GET /internal/metrics` exposes a lightweight in-process metrics snapshot for operational monitoring.
This endpoint is **internal-only** and must not be exposed to the public internet.

## Authentication

No authentication is required. Access control must be enforced at the network/infrastructure layer
(e.g., firewall rules, VPC-only routing, or a reverse-proxy allow-list).

## Response Shape

```
GET /internal/metrics
```

Success (`200 OK`):

```json
{
  "success": true,
  "data": {
    "generatedAt": "2026-04-27T10:00:00.000Z",
    "uptimeSeconds": 3600,
    "counters": {
      "authFailures": 12,
      "queueReportRequests": 340,
      "queueReportFailures": 2
    },
    "requests": {
      "POST /auth/login 2xx": {
        "count": 120,
        "totalDurationMs": 18000,
        "maxDurationMs": 450,
        "averageDurationMs": 150.00
      }
    }
  }
}
```

## Fields

| Field | Type | Description |
|---|---|---|
| `generatedAt` | ISO 8601 string | Timestamp when the snapshot was taken |
| `uptimeSeconds` | number | Seconds since the process started |
| `counters` | object | Named event counters incremented by the application |
| `counters.authFailures` | number | Total authentication failures since startup |
| `counters.queueReportRequests` | number | Total queue report submissions attempted |
| `counters.queueReportFailures` | number | Total queue report submissions that failed |
| `requests` | object | Per-route request metrics keyed by `METHOD /path Nxx` |
| `requests[key].count` | number | Total requests matching this key |
| `requests[key].totalDurationMs` | number | Cumulative response time in milliseconds |
| `requests[key].maxDurationMs` | number | Slowest single response in milliseconds |
| `requests[key].averageDurationMs` | number | Mean response time in milliseconds |

## Notes

- All metrics are **in-memory only** and reset on process restart.
- Counters can be extended by calling `incrementCounter(name)` from `services/metrics.ts`.
- Request metrics are recorded by the `requestMetricsMiddleware` in `middleware/observability.ts`.
- This endpoint is not versioned and may change without notice.
