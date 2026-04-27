# API Contract Changelog

This document tracks breaking and non-breaking changes to the Qyou API contract.
Clients (mobile app, admin web) should review this before upgrading.

## Format

Each entry follows:

```
## [version] - YYYY-MM-DD
### Breaking
### Added
### Changed
### Deprecated
### Removed
### Fixed
```

---

## [Unreleased]

### Added
- `GET /queues/:locationId/history` — returns queue history points and trend for a location.
  Query params: `windowHours` (default 6), `limit` (default 24, max 200).
- `GET /internal/metrics` — internal-only in-process metrics snapshot (not for public clients).
- Rate-limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`,
  `Retry-After`) on all rate-limited routes.
- New rate-limit groups: `location-read` and `admin` (configurable via env vars).

### Changed
- Admin authorization errors now return `403 FORBIDDEN` when the token is valid but the role
  is not `ADMIN`, instead of `401 AUTH_ERROR`. Missing or invalid tokens still return `401`.
- Logger now includes `service: "qyou-api"` in every log line and uses standard pino serializers
  for `err`, `req`, and `res` fields.

---

## [1.0.0] - 2026-04-01

### Added
- Initial API contract (see `docs/api/contract-v1.md`).
- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`.
- `GET /locations/nearby`, `GET /locations/clusters`, `GET /locations/:id`.
- `POST /queues/report`.
- `GET /rewards/balance`, `GET /rewards/history`, `POST /rewards/claim`.
- `GET /health`, `GET /ready`.
- `GET /admin/audit` — admin-only audit log listing.
- `POST /admin/locations/seed` — admin-only location seed endpoint.
