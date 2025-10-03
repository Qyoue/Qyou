// File: apps/api/src/index.ts
import express, { Request, Response } from 'express';
import connectDB from './config/db';
import User from './models/User';
import { walletQueue } from './queues/wallet.queue';

connectDB();

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ message: 'Qyou API is healthy!' });
});

// New Registration Endpoint
app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { email, fullName } = req.body;

  if (!email || !fullName) {
    return res.status(400).json({ msg: 'Please enter all fields' });
  }

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    user = new User({ email, fullName });
    await user.save();

    // Add a job to the queue to create the wallet for this new user
    await walletQueue.add('create-wallet', { userId: user.id });
    console.log(`[api]: Added wallet creation job for user ${user.id}`);

    res.status(201).json({ msg: 'User registered successfully. Wallet creation is in progress.' });
  } catch (err: any) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

app.listen(port, () => {
  console.log(`[api]: Server is running at http://localhost:${port}`);
});