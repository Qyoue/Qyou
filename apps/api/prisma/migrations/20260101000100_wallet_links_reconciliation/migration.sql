-- #1146 wallet_links (idempotent) and #1143 ReconciliationRun.
-- The wallet_links columns follow the issue text (encryptedSecretKey exists on the model);
-- compare with `WalletLink` in schema.prisma before applying to a database that already has it.
-- Rollback (documented in packages/stellar/docs/persistence-and-encryption.md):
--   DROP TABLE "ReconciliationRun"; DROP TABLE "wallet_links";
--   (dropping wallet_links deletes linked wallets: export first)

CREATE TABLE IF NOT EXISTS "wallet_links" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "publicKey" TEXT NOT NULL,
  "encryptedSecretKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wallet_links_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "wallet_links_userId_key" ON "wallet_links"("userId");
CREATE INDEX IF NOT EXISTS "wallet_links_publicKey_idx" ON "wallet_links"("publicKey");

CREATE TABLE "ReconciliationRun" (
  "id" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "finishedAt" TIMESTAMP(3),
  "checked" INTEGER NOT NULL DEFAULT 0,
  "mismatchCount" INTEGER NOT NULL DEFAULT 0,
  "summary" JSONB,
  CONSTRAINT "ReconciliationRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ReconciliationRun_startedAt_idx" ON "ReconciliationRun"("startedAt");
