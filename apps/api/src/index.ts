import express, { Request, Response } from 'express'
import { randomInt, randomBytes, createHash, timingSafeEqual, scrypt as _scrypt } from 'crypto'
import { promisify } from 'util'
import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import authRoutes from './routes/auth';
import express, { Request, Response } from 'express';
import router from './routes/userRoutes';
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './utils/config';
import { requestLogger, requestId } from './middleware/logger';
import { errorHandler, notFound } from './middleware/errorHandler';
import routes from './routes';


const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use('/api/auth', authRoutes);

app.use(helmet());

app.use("/api/users", router);


app.get('/api/health', (req: Request, res: Response) => {
  res.json({ message: 'Qyou API is healthy!' });
});

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/qyou';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));


app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

app.listen(port, () => {
  console.log(`[api]: Server is running at http://localhost:${port}`);

 app.use(cors(config.cors));


app.use(requestId);


app.use(requestLogger(config.nodeEnv));


app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


app.use('/api', routes);


app.use(notFound);


app.use(errorHandler);


app.listen(config.port, () => {
  console.log(`[api]: Server is running at http://localhost:${config.port}`);
  console.log(`[api]: Environment: ${config.nodeEnv}`);

});

const scrypt = promisify(_scrypt)


const users = new Map<string, User>()

async function seedDemoUser() {
  const email = 'test@example.com'
  const password = 'Password123!'
  const hash = await hashPassword(password)
  users.set(email, { email, passwordHash: hash })
}

function generateResetCode(): string {
  const code = randomInt(0, 1_000_000).toString().padStart(6, '0')
  return code
}

function hashResetCode(code: string): Buffer {
  return createHash('sha256').update(code, 'utf8').digest()
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derivedKey = (await scrypt(password, salt, 32)) as Buffer
  return `scrypt:${salt.toString('hex')}:${derivedKey.toString('hex')}`
}

function verifyResetCode(providedCode: string, storedHash?: Buffer): boolean {
  if (!storedHash) return false
  const providedHash = hashResetCode(providedCode)
  if (providedHash.length !== storedHash.length) return false
  return timingSafeEqual(providedHash, storedHash)
}

async function sendResetCodeEmail(email: string, code: string) {
  
  console.log(`[api]: Sending password reset code to ${email}: ${code}`)
}


app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body || {}
  if (typeof email !== 'string' || email.trim().length === 0) {
    return res.status(400).json({ error: 'Email is required' })
  }

  const normalizedEmail = email.trim().toLowerCase()
  const user = users.get(normalizedEmail)

  // Always respond with success to avoid user enumeration
  const successResponse = { message: 'If the email exists, a reset code has been sent.' }

  if (!user) {
    return res.status(200).json(successResponse)
  }

  const code = generateResetCode()
  const codeHash = hashResetCode(code)
  const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutes

  user.resetTokenHash = codeHash
  user.resetTokenExpiresAt = expiresAt
  users.set(normalizedEmail, user)

  try {
    await sendResetCodeEmail(normalizedEmail, code)
  } catch (err) {
    console.error('[api]: Failed to send reset code email', err)
    // Still respond 200 to avoid leaking existence
  }

  return res.status(200).json(successResponse)
})


app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
  const { email, token, newPassword } = req.body || {}

  if (typeof email !== 'string' || email.trim().length === 0) {
    return res.status(400).json({ error: 'Email is required' })
  }
  if (typeof token !== 'string' || token.trim().length === 0) {
    return res.status(400).json({ error: 'Token is required' })
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' })
  }

  const normalizedEmail = email.trim().toLowerCase()
  const user = users.get(normalizedEmail)
  if (!user) {
    // Do not reveal existence
    return res.status(400).json({ error: 'Invalid token or email' })
  }

  if (!user.resetTokenHash || !user.resetTokenExpiresAt || Date.now() > user.resetTokenExpiresAt) {
    return res.status(400).json({ error: 'Reset token is invalid or expired' })
  }

  const valid = verifyResetCode(token.trim(), user.resetTokenHash)
  if (!valid) {
    return res.status(400).json({ error: 'Reset token is invalid or expired' })
  }

  
  const newHash = await hashPassword(newPassword)
  user.passwordHash = newHash
  user.resetTokenHash = undefined
  user.resetTokenExpiresAt = undefined
  users.set(normalizedEmail, user)

  return res.status(200).json({ message: 'Password updated successfully' })
})


seedDemoUser().catch((e) => console.error('[api]: Failed to seed demo user', e))
