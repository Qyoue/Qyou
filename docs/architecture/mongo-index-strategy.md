# MongoDB Index Synchronization Strategy

## Problem

Calling `Model.syncIndexes()` on every startup can cause issues in production:
- It drops and recreates indexes that differ from the schema definition.
- On large collections this can be slow and block queries.
- Dropping an index that is still needed by a running query causes errors.

## Chosen Strategy: Explicit `ensureIndexes` per Model, Startup-Only

Each model that requires index management exposes an `ensure<Model>Indexes()` function.
The server calls these functions once during startup, **before** accepting traffic.

### Rules

1. **`syncIndexes()` is allowed only in development and test environments.**
   In production, use `createIndexes()` which is additive and never drops.

2. **Index changes in production must be applied via a migration script**, not via `syncIndexes()`.

3. **The startup sequence must complete index creation before the HTTP server binds.**

## Implementation

```typescript
// models/Location.ts
export const ensureLocationIndexes = async () => {
  if (process.env.NODE_ENV === 'production') {
    await Location.createIndexes();
  } else {
    await Location.syncIndexes();
  }
};
```

```typescript
// server.ts
async function connectDB() {
  await mongoose.connect(MONGO_URI);
  await ensureLocationIndexes();
  logger.info('MongoDB connected and indexes ensured');
}
```

## Adding Indexes to a New Model

1. Define indexes in the schema using `schema.index(...)`.
2. Export an `ensure<Model>Indexes()` function from the model file.
3. Call it in `server.ts` inside `connectDB()`.

## Dropping or Changing an Index in Production

1. Write a one-off migration script in `apps/api/scripts/`.
2. Run the script against the target database before deploying the new code.
3. Update the schema definition to match.
4. Do **not** rely on `syncIndexes()` to drop the old index automatically.

## Background Index Builds

For large collections, use `{ background: true }` in the index options to avoid blocking reads/writes:

```typescript
schema.index({ location: '2dsphere' }, { background: true });
```

Note: MongoDB 4.2+ builds all indexes in the background by default.
