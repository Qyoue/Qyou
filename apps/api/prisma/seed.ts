import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password1!', 10);

  const operator = await prisma.user.upsert({
    where: { email: 'operator@qyou.local' },
    update: {},
    create: { email: 'operator@qyou.local', passwordHash },
  });

  const member = await prisma.user.upsert({
    where: { email: 'member@qyou.local' },
    update: {},
    create: { email: 'member@qyou.local', passwordHash },
  });

  // Sample queue incentive configs represent seeded queues for local dev.
  const queues = [
    { queueId: 'queue-seed-bank-1', rewardAmount: '10', asset: 'XLM', enabled: true, maxRewardsPerUser: 5 },
    { queueId: 'queue-seed-hospital-1', rewardAmount: '5', asset: 'XLM', enabled: true, maxRewardsPerUser: 3 },
  ];

  for (const q of queues) {
    await prisma.queueIncentiveConfig.upsert({
      where: { queueId: q.queueId },
      update: { rewardAmount: q.rewardAmount, asset: q.asset, enabled: q.enabled, maxRewardsPerUser: q.maxRewardsPerUser },
      create: q,
    });
  }

  console.log('Seeded operator:', operator.email);
  console.log('Seeded member:', member.email);
  console.log('Seeded queues:', queues.map((q) => q.queueId).join(', '));
}

async function revokeSessionByRefreshToken(
  prisma: PrismaClient,
  rawRefreshToken: string | undefined,
  hashToken: (token: string) => string,
): Promise<void> {
  if (!rawRefreshToken) {
    return;
  }

  const tokenHash = hashToken(rawRefreshToken);
  const now = new Date();

  await prisma.refreshToken.updateMany({
    where: {
      tokenHash,
      revokedAt: null,
    },
    data: {
      revokedAt: now,
    },
  });
}
async function revokeAllUserSessions(
  prisma: PrismaClient,
  userId: string,
): Promise<number> {
  const result = await prisma.refreshToken.updateMany({
    where: {
      userId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });

  return result.count;
}
async function buildSessionLifecyclePayload(
  prisma: PrismaClient,
  rawToken: string | undefined,
  hashToken: (token: string) => string,
): Promise<SessionLifecyclePayload> {
  if (!rawToken) {
    return {
      valid: false,
      expired: false,
      revoked: false,
      expiresAt: null,
    };
  }

  const tokenHash = hashToken(rawToken);
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (!record) {
    return {
      valid: false,
      expired: false,
      revoked: false,
      expiresAt: null,
    };
  }

  const now = new Date();
  const expired = record.expiresAt <= now;
  const revoked = record.revokedAt !== null;
  const valid = !expired && !revoked;

  return {
    valid,
    expired,
    revoked,
    expiresAt: record.expiresAt.toISOString(),
  };
}
main().finally(() => prisma.$disconnect());
