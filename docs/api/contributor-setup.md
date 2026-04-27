# API Contributor Setup

## Prerequisites

- Node.js v20 or higher
- MongoDB running locally or via Atlas
- Git

## 1. Clone and Install

```bash
git clone https://github.com/Qyoue/Qyou.git
cd Qyou
npm install
```

Dependencies are managed at the monorepo root. All workspaces share the root `node_modules`.

## 2. Environment Variables

Copy the API workspace template:

```bash
cp apps/api/.env.example apps/api/.env
```

Required variables:

| Variable | Description | Example |
|---|---|---|
| `API_PORT` | Port the API listens on | `4000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/qyou` |
| `JWT_ACCESS_SECRET` | Access token signing secret (min 32 chars) | — |
| `JWT_REFRESH_SECRET` | Refresh token signing secret (min 32 chars) | — |

Optional variables:

| Variable | Description | Default |
|---|---|---|
| `REDIS_URL` | Redis connection URL for location cache | disabled |
| `LOG_LEVEL` | Pino log level | `info` |
| `AUTH_RATE_LIMIT_WINDOW_MS` | Auth rate limit window in ms | `900000` (15 min) |
| `AUTH_RATE_LIMIT_MAX_REQUESTS` | Max auth requests per window | `20` |
| `QUEUE_REPORT_RATE_LIMIT_WINDOW_MS` | Queue report rate limit window in ms | `600000` (10 min) |
| `QUEUE_REPORT_RATE_LIMIT_MAX_REQUESTS` | Max queue reports per window | `15` |
| `LOCATION_READ_RATE_LIMIT_WINDOW_MS` | Location read rate limit window in ms | `60000` (1 min) |
| `LOCATION_READ_RATE_LIMIT_MAX_REQUESTS` | Max location reads per window | `120` |
| `ADMIN_RATE_LIMIT_WINDOW_MS` | Admin rate limit window in ms | `60000` (1 min) |
| `ADMIN_RATE_LIMIT_MAX_REQUESTS` | Max admin requests per window | `60` |

## 3. Run the API

```bash
npm run dev --workspace=apps/api
```

The API starts on `http://localhost:4000`. Check `GET /health` to confirm it is running.

## 4. Run Tests

```bash
npm run test --workspace=apps/api
```

Tests use the Node.js built-in test runner (`node --import tsx --test`). No Jest or Mocha.

## 5. Type Check

```bash
npm run typecheck --workspace=apps/api
```

## 6. Seed Demo Data

```bash
npm run seed:demo --workspace=apps/api
```

This upserts demo users and locations. Pass `--force` to re-seed even if already seeded:

```bash
npm run seed:demo --workspace=apps/api -- --force
```

## 7. Project Structure

```
apps/api/
├── auth/          # Token helpers (issue, verify, hash)
├── errors/        # AppError, ValidationError, AuthError, ForbiddenError
├── lib/           # Shared utilities (validation, pagination, objectId, responseEnvelope)
├── middleware/    # Express middleware (auth, rate limit, error handler, observability)
├── models/        # Mongoose models (User, Session, Location, QueueReport, AuditLog)
├── modules/       # Module barrel exports
├── routes/        # Express route handlers
├── scripts/       # One-off scripts (seed-demo, seed-locations)
├── services/      # Business logic (auditLog, locationCache, metrics, queueHistory, queueSnapshots)
├── tests/         # Integration and unit tests
├── app.ts         # Express app factory
├── index.ts       # Entry point
├── logger.ts      # Pino logger instance
└── server.ts      # Server startup (DB connect, graceful shutdown)
```

## 8. Adding a New Route

1. Create a router file in `apps/api/routes/`.
2. Register it in `apps/api/app.ts`.
3. Add integration tests in `apps/api/tests/`.

## 9. Coding Conventions

- TypeScript strict mode is enabled.
- Use `AppError` subclasses for all thrown errors.
- Log with the shared `logger` from `logger.ts` — do not use `console.log` in production code.
- All responses use the `{ success, data }` / `{ success, error }` envelope.
