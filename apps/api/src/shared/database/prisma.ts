import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

// Gracefully disconnect Prisma on process termination so connection pool
// is flushed before the process exits — prevents connection leaks during
// rolling deploys or container restarts (#818).
function shutdown() {
  prisma.$disconnect().finally(() => process.exit(0));
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
