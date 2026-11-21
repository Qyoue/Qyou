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

main().finally(() => prisma.$disconnect());
