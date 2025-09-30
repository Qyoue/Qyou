import express, { Request, Response } from 'express'
import { randomInt, randomBytes, createHash, timingSafeEqual, scrypt as _scrypt } from 'crypto'
import { promisify } from 'util'

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ message: 'Qyou API is healthy!' });
});

app.listen(port, () => {
  console.log(`[api]: Server is running at http://localhost:${port}`);
});

const scrypt = promisify(_scrypt)

// Simple in-memory user store for demo purposes. Replace with your DB.
type User = {
  email: string
  passwordHash: string // Format: scrypt:<saltHex>:<hashHex>
  resetTokenHash?: Buffer
  resetTokenExpiresAt?: number // epoch ms
}

const users = new Map<string, User>()

// Seed a demo user (password: "Password123!")
async function seedDemoUser() {
  const email = 'test@example.com'
  const password = 'Password123!'
  const hash = await hashPassword(password)
  users.set(email, { email, passwordHash: hash })
}

function generateResetCode(): string {
  // 6-digit numeric code without leading zeros bias
  // randomInt(0, 1_000_000) produces uniform 0..999999
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
  // Integrate with SendGrid/AWS SES here. Using console log for demo.
  console.log(`[api]: Sending password reset code to ${email}: ${code}`)
}

// Forgot Password Endpoint
// Accepts email, generates short-lived code, stores hash+expiry, and sends the code via email
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

// Reset Password Endpoint
// Accepts email, token (code), and newPassword. Verifies token validity/expiry, updates password, invalidates token.
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

  // All good: update password and invalidate token
  const newHash = await hashPassword(newPassword)
  user.passwordHash = newHash
  user.resetTokenHash = undefined
  user.resetTokenExpiresAt = undefined
  users.set(normalizedEmail, user)

  return res.status(200).json({ message: 'Password updated successfully' })
})

// Initialize demo data
seedDemoUser().catch((e) => console.error('[api]: Failed to seed demo user', e))
