-- #1359: rewards, idempotency keys and per-queue incentive configuration.
-- Rollback: DROP TABLE "queue_incentive_configs"; DROP TABLE "rewards";

CREATE TABLE "rewards" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "queueId" TEXT NOT NULL,
  "recipient" TEXT NOT NULL,
  "amount" TEXT NOT NULL,
  "asset" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "transactionHash" TEXT,
  "error" TEXT,
  "idempotencyKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmedAt" TIMESTAMP(3),
  CONSTRAINT "rewards_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "rewards_idempotencyKey_key" ON "rewards"("idempotencyKey");
CREATE INDEX "rewards_userId_createdAt_idx" ON "rewards"("userId", "createdAt");
CREATE INDEX "rewards_queueId_idx" ON "rewards"("queueId");

CREATE TABLE "queue_incentive_configs" (
  "queueId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "rewardAmount" TEXT NOT NULL,
  "asset" TEXT NOT NULL,
  "maxRewardsPerUser" INTEGER,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "queue_incentive_configs_pkey" PRIMARY KEY ("queueId")
);
