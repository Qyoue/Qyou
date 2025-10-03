// File: apps/api/src/workers/wallet.worker.ts
import { Worker } from 'bullmq';
import { createAndFundAccount } from '../services/stellarService';
import User from '../models/User';
import connectDB from '../config/db';

// A Redis connection is needed.
const redisConnection = {
  host: 'localhost',
  port: 6379,
};

const processWalletJob = async (job: any) => {
  const { userId } = job.data;
  console.log(`Processing wallet creation job for user: ${userId}`);

  try {
    const newKeypair = await createAndFundAccount();

    await User.findByIdAndUpdate(userId, {
      stellarPublicKey: newKeypair.publicKey(),
      // IMPORTANT: In production, encrypt this secret key before saving!
      stellarSecretKey: newKeypair.secret(),
    });

    console.log(`Successfully created and saved wallet for user: ${userId}`);
  } catch (error) {
    console.error(`Failed to create wallet for user ${userId}:`, error);
    throw error; // This will cause BullMQ to retry the job
  }
};

// Connect to DB before starting worker
connectDB().then(() => {
  console.log('[worker]: MongoDB connected. Starting wallet worker...');
  new Worker('wallet-creation', processWalletJob, {
    connection: redisConnection,
  });
});