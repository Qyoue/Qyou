import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { AuthError, ValidationError } from '../errors/AppError';
import { authRateLimit } from '../middleware/rateLimit';
import { requireEmail, requireMinLength, requireString } from '../lib/validation';
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth';
import { Session } from '../models/Session';
import { User } from '../models/User';
import { recordAuditEvent } from '../services/auditLog';
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
const readCurrentDeviceId = (req: { headers: Record<string, unknown>; body?: Record<string, unknown> }) => {
  const headerValue = req.headers['x-device-id'];
  const headerDeviceId =
    typeof headerValue === 'string'
      ? headerValue.trim()
      : Array.isArray(headerValue)
        ? String(headerValue[0] || '').trim()
        : '';
  const bodyDeviceId = String(req.body?.deviceId || '').trim();
  return headerDeviceId || bodyDeviceId;
};

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

const revokeMatchingSessions = async (params: {
  userId: string;
  reason: string;
  deviceId?: string;
}) => {
  const filter: Record<string, unknown> = {
    userId: params.userId,
    status: { $ne: 'revoked' },
  };

  if (params.deviceId) {
    filter.deviceId = params.deviceId;
  }

  const result = await Session.updateMany(filter, {
    $set: {
      status: 'revoked',
      revokedAt: new Date(),
      revokedReason: params.reason,
    },
  });

  return result.modifiedCount;
};

router.post('/register', async (req, res) => {
  const email = requireEmail(req.body?.email);
  const password = requireMinLength(requireString(req.body?.password, 'password'), 'password', 8);

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

  await recordAuditEvent({
    action: 'AUTH_REGISTER',
    actorId: String(user._id),
    actorEmail: user.email,
    actorRole: user.role,
    targetType: 'user',
    targetId: String(user._id),
    req,
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
  const email = requireEmail(req.body?.email);
  const password = requireString(req.body?.password, 'password');
  const providedDeviceId = String(req.body?.deviceId || '').trim();

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

  await recordAuditEvent({
    action: 'AUTH_LOGIN',
    actorId: String(user._id),
    actorEmail: user.email,
    actorRole: user.role,
    targetType: 'session',
    targetId: tokenId,
    metadata: {
      deviceId,
      familyId,
    },
    req,
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
  const refreshToken = requireString(req.body?.refreshToken, 'refreshToken');

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

  await recordAuditEvent({
    action: 'AUTH_REFRESH',
    actorId: String(user._id),
    actorEmail: user.email,
    actorRole: user.role,
    targetType: 'session',
    targetId: nextTokenId,
    metadata: {
      deviceId: payload.deviceId,
      familyId: payload.familyId,
    },
    req,
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

router.get('/me', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const user = await User.findById(authReq.auth.userId, {
    _id: 1,
    email: 1,
    role: 1,
    createdAt: 1,
    updatedAt: 1,
  }).lean();

  if (!user) {
    throw new AuthError('User account not found');
  }

  res.json({
    success: true,
    data: {
      user: {
        id: String(user._id),
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    },
  });
});

router.get('/sessions', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const currentDeviceId = readCurrentDeviceId(req as typeof req & { body?: Record<string, unknown> });

  const sessions = await Session.find({ userId: authReq.auth.userId })
    .sort({ updatedAt: -1, createdAt: -1 })
    .lean();

  res.json({
    success: true,
    data: {
      items: sessions.map((session) => ({
        id: String(session._id),
        deviceId: session.deviceId,
        familyId: session.familyId,
        tokenId: session.tokenId,
        status: session.status,
        expiresAt: session.expiresAt,
        consumedAt: session.consumedAt,
        revokedAt: session.revokedAt,
        revokedReason: session.revokedReason,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        isCurrentDevice: Boolean(currentDeviceId && session.deviceId === currentDeviceId),
      })),
    },
  });
});

router.post('/logout', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const requestedScope = String(req.body?.scope || 'current-device').trim().toLowerCase();
  const scope = requestedScope === 'all-devices' ? 'all-devices' : 'current-device';
  const deviceId = readCurrentDeviceId(req);

  const revokedCount =
    scope === 'all-devices'
      ? await revokeMatchingSessions({
          userId: authReq.auth.userId,
          reason: 'USER_LOGOUT_ALL_DEVICES',
        })
      : await revokeMatchingSessions({
          userId: authReq.auth.userId,
          deviceId: deviceId || undefined,
          reason: deviceId ? 'USER_LOGOUT_CURRENT_DEVICE' : 'USER_LOGOUT_FALLBACK_ALL',
        });

  res.json({
    success: true,
    data: {
      scope,
      revokedCount,
      deviceId: deviceId || null,
    },
  });
});

export const authRouter = router;
