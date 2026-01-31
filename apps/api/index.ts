import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

import { STELLAR_CONFIG } from '@qyou/stellar';

const app = express();
const PORT = process.env.API_PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/qyou';

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Qyou API', timestamp: new Date() });
});

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`✅ MongoDB Connected`);
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  }
};

app.listen(PORT, async () => {
  await connectDB();
  console.log(`🚀 API running on http://localhost:${PORT}`);

  // LOG THE STELLAR CONFIG TO PROVE IT WORKS
  console.log(`🌌 Stellar Mode: ${STELLAR_CONFIG.network}`);
});
