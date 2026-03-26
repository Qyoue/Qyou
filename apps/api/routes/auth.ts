import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { AuthError, ValidationError } from '../errors/AppError';
import { authRateLimit } from '../middleware/rateLimit';
import { Session } from '../models/Session';
import { User } from '../models/User';
import {
  generateDeviceId,
  generateFamilyId,
  generateTokenId,
  hashToken,
  issueTokenPair,
  verifyRefreshToken,
} from '../auth/tokens';

const router = Router();

router.use(authRateLimit);

const revokeAllUserSessions = async (userId: string, reason: string) => {
  await Session.updateMany(
    { userId, status: { $ne: 'revoked' } },
    {
      $set: {
        status: 'revoked',
        revokedAt: new Date(),
        revokedReason: reason,
      },
    },
  );
};

router.post('/register', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    throw new ValidationError('email and password are required');
  }
  if (password.length < 8) {
    throw new ValidationError('password must be at least 8 characters');
  }

  const existing = await User.findOne({ email }).lean();
  if (existing) {
    throw new ValidationError('email is already registered');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    email,
    passwordHash,
    role: 'USER',
  });

  res.status(201).json({
    success: true,
    data: {
      userId: String(user._id),
      email: user.email,
    },
  });
});

router.post('/login', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const providedDeviceId = String(req.body?.deviceId || '').trim();

  if (!email || !password) {
    throw new ValidationError('email and password are required');
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new AuthError('Invalid email or password');
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new AuthError('Invalid email or password');
  }

  const deviceId = providedDeviceId || generateDeviceId();
  const familyId = generateFamilyId();
  const tokenId = generateTokenId();

  const tokenPair = issueTokenPair({
    userId: String(user._id),
    role: user.role,
    deviceId,
    familyId,
    tokenId,
  });

  await Session.updateMany(
    { userId: user._id, deviceId, status: 'active' },
    {
      $set: {
        status: 'revoked',
        revokedAt: new Date(),
        revokedReason: 'DEVICE_RELOGIN',
      },
    },
  );

  await Session.create({
    userId: user._id,
    deviceId,
    familyId,
    tokenId,
    refreshTokenHash: hashToken(tokenPair.refreshToken),
    expiresAt: tokenPair.refreshExpiresAt,
    status: 'active',
  });

  res.json({
    success: true,
    data: {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      deviceId,
    },
  });
});

router.post('/refresh', async (req, res) => {
  const refreshToken = String(req.body?.refreshToken || '');
  if (!refreshToken) {
    throw new ValidationError('refreshToken is required');
  }

  const payload = verifyRefreshToken(refreshToken);
  const tokenHash = hashToken(refreshToken);

  const currentSession = await Session.findOne({
    refreshTokenHash: tokenHash,
    userId: payload.sub,
    familyId: payload.familyId,
    tokenId: payload.tokenId,
  });

  if (!currentSession) {
    await revokeAllUserSessions(payload.sub, 'REFRESH_TOKEN_REUSE_OR_UNKNOWN');
    throw new AuthError('Refresh token is invalid');
  }

  if (currentSession.status !== 'active') {
    await revokeAllUserSessions(payload.sub, 'REFRESH_TOKEN_REUSE_DETECTED');
    throw new AuthError('Refresh token reuse detected. All sessions revoked.');
  }

  if (currentSession.expiresAt.getTime() <= Date.now()) {
    currentSession.status = 'revoked';
    currentSession.revokedAt = new Date();
    currentSession.revokedReason = 'REFRESH_TOKEN_EXPIRED';
    await currentSession.save();
    throw new AuthError('Refresh token is expired');
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    await revokeAllUserSessions(payload.sub, 'USER_NOT_FOUND');
    throw new AuthError('User account not found');
  }

  const nextTokenId = generateTokenId();
  const tokenPair = issueTokenPair({
    userId: String(user._id),
    role: user.role,
    deviceId: payload.deviceId,
    familyId: payload.familyId,
    tokenId: nextTokenId,
  });
  const nextHash = hashToken(tokenPair.refreshToken);

  currentSession.status = 'consumed';
  currentSession.consumedAt = new Date();
  currentSession.replacedByHash = nextHash;
  await currentSession.save();

  await Session.create({
    userId: user._id,
    deviceId: payload.deviceId,
    familyId: payload.familyId,
    tokenId: nextTokenId,
    refreshTokenHash: nextHash,
    parentTokenHash: tokenHash,
    expiresAt: tokenPair.refreshExpiresAt,
    status: 'active',
  });

  res.json({
    success: true,
    data: {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      deviceId: payload.deviceId,
    },
  });
});

export const authRouter = router;
