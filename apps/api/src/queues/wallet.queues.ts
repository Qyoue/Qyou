// File: apps/api/src/queues/wallet.queue.ts
import { Queue } from 'bullmq';

// A Redis connection is needed. For local dev, ensure you have Redis running.
// You can use Docker: `docker run --name redis -p 6379:6379 -d redis`
const redisConnection = {
  host: 'localhost',
  port: 6379,
};

export const walletQueue = new Queue('wallet-creation', {
  connection: redisConnection,
});