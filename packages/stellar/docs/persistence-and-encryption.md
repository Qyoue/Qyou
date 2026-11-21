# Wallet-link migration, encryption and metrics (#1143-#1146)

## #1146 migration and rollback

`apps/api/prisma/migrations/20260101000100_wallet_links_reconciliation/migration.sql` creates
`wallet_links` (with `IF NOT EXISTS`, so it is safe where the table exists) and
`ReconciliationRun`. **Verify the columns against `WalletLink` in `schema.prisma` before merging;
that file was not reviewed.** Rename the folder if newer migrations exist.

Rollback: `DROP TABLE "ReconciliationRun"; DROP TABLE "wallet_links";`. Dropping `wallet_links`
deletes linked wallets, so export first (`pg_dump -t wallet_links`). CI applying all migrations to
an empty database (`prisma migrate deploy`) is not added here.

## #1143 reconciliation history

`ReconciliationRun` stores start/finish, `checked`, `mismatchCount` and a JSON `summary`.
Retention: delete rows older than 90 days in a scheduled job (not included). `reconciliation-job.ts`
must write a row per run instead of only returning a `recon-run-*` id.

## #1145 encryption scheme

`packages/stellar/src/security/envelope-encryption.ts`: AES-256-GCM, a fresh 32-byte data key per
secret, the data key wrapped by a KMS master key, stored as a versioned envelope
(`keyId`, wrapped key, IV, tag, ciphertext). The owner's id should be passed as AAD so a
ciphertext cannot be moved to another row.

Rotation procedure: (1) create the new KMS key version and make it current; (2) run a job that
calls `rewrapSecret` for every row (ciphertext is untouched, so it is fast and safe to retry);
(3) once no envelope references the old `keyId`, disable the old version, then schedule its
deletion after the KMS retention window. A test with a fake KMS is required and **not** included.

## #1144 metrics

Decision: export instead of keeping local state. `renderPrometheus` in
`packages/stellar/src/analytics/prometheus.ts` formats the collectors for a `/metrics` route;
Prometheus owns history and counter resets. OpenTelemetry is an alternative if the platform
already runs a collector. The route and wiring are not added.
