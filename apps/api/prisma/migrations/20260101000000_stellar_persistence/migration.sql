-- #1135 StellarAuditLog, #1136/#1137 Reward, #1138 QueueIncentiveConfig
-- Rollback: DROP TABLE "QueueIncentiveConfig"; DROP TABLE "Reward"; DROP TYPE "RewardStatus"; DROP TABLE "StellarAuditLog";

CREATE TYPE "RewardStatus" AS ENUM ('PENDING', 'SUBMITTED', 'CONFIRMED', 'FAILED');

CREATE TABLE "StellarAuditLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StellarAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "StellarAuditLog_userId_createdAt_idx" ON "StellarAuditLog"("userId", "createdAt");

CREATE TABLE "Reward" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "queueId" TEXT NOT NULL,
  "amount" DECIMAL(20,7) NOT NULL,
  "asset" TEXT NOT NULL DEFAULT 'QYOU',
  "txHash" TEXT,
  "status" "RewardStatus" NOT NULL DEFAULT 'PENDING',
  "idempotencyKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Reward_idempotencyKey_key" ON "Reward"("idempotencyKey");
CREATE INDEX "Reward_userId_createdAt_idx" ON "Reward"("userId", "createdAt");
CREATE INDEX "Reward_queueId_createdAt_idx" ON "Reward"("queueId", "createdAt");
CREATE INDEX "Reward_status_idx" ON "Reward"("status");

CREATE TABLE "QueueIncentiveConfig" (
  "queueId" TEXT NOT NULL,
  "config" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QueueIncentiveConfig_pkey" PRIMARY KEY ("queueId")
);
