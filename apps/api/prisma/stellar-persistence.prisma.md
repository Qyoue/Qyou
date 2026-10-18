# Stellar persistence models (#1135-#1138)

Paste into `apps/api/prisma/schema.prisma` (not edited here because the file was not reviewed).
The matching SQL is `migrations/20260101000000_stellar_persistence/migration.sql`; the migration
folder name must be re-timestamped if migrations newer than it exist, and `seed.ts` needs a
sample `QueueIncentiveConfig` row (not included).

```prisma
model StellarAuditLog {
  id        String   @id @default(cuid())
  userId    String
  action    String
  metadata  Json?
  createdAt DateTime @default(now())

  @@index([userId, createdAt])
}

enum RewardStatus {
  PENDING
  SUBMITTED
  CONFIRMED
  FAILED
}

model Reward {
  id             String       @id @default(cuid())
  userId         String
  queueId        String
  amount         Decimal      @db.Decimal(20, 7)
  asset          String       @default("QYOU")
  txHash         String?
  status         RewardStatus @default(PENDING)
  idempotencyKey String       @unique
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@index([userId, createdAt])
  @@index([queueId, createdAt])
  @@index([status])
}

model QueueIncentiveConfig {
  queueId   String   @id
  config    Json
  updatedAt DateTime @updatedAt
}
```

## Ordering rules

- **Audit log (#1135):** append-only; the application only ever inserts. Revoke `UPDATE`/`DELETE`
  on the table for the application role in production.
- **Idempotency (#1137):** insert the `Reward` row with `status = PENDING` and its
  `idempotencyKey` first; a unique violation means the payout was already started, so return the
  existing row. Only then submit the payment, then set `SUBMITTED` / `CONFIRMED` with the hash.
  A restart finds `PENDING`/`SUBMITTED` rows and resumes them by looking up the hash instead of
  paying again. The recovery job is not included.
- **Queue config (#1138):** CRUD on `QueueIncentiveConfig`, read through a cache that is
  invalidated on write; the cache layer is not included.
