import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { AuthError, AppError } from '../errors/AppError';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

type AccessPayload = {
  type: 'access';
  sub: string;
  role: 'USER' | 'ADMIN';
};

type RefreshPayload = {
  type: 'refresh';
  sub: string;
  deviceId: string;
  familyId: string;
  tokenId: string;
};

const readSecret = (name: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET') => {
  const secret = process.env[name];
  if (!secret || secret.length < 32) {
    throw new AppError(`${name} is not configured`, 500, 'AUTH_CONFIG_ERROR');
  }
  return secret;
};

const signToken = (
  payload: AccessPayload | RefreshPayload,
  secret: string,
  expiresIn: jwt.SignOptions['expiresIn'],
) => jwt.sign(payload, secret, { expiresIn });

export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

export const generateTokenId = (): string => crypto.randomUUID();
export const generateFamilyId = (): string => crypto.randomUUID();
export const generateDeviceId = (): string => crypto.randomUUID();

export const issueTokenPair = (params: {
  userId: string;
  role: 'USER' | 'ADMIN';
  deviceId: string;
  familyId: string;
  tokenId: string;
}) => {
  const accessSecret = readSecret('JWT_ACCESS_SECRET');
  const refreshSecret = readSecret('JWT_REFRESH_SECRET');

  const accessToken = signToken(
    { type: 'access', sub: params.userId, role: params.role },
    accessSecret,
    ACCESS_TOKEN_TTL,
  );

  const refreshToken = signToken(
    {
      type: 'refresh',
      sub: params.userId,
      deviceId: params.deviceId,
      familyId: params.familyId,
      tokenId: params.tokenId,
    },
    refreshSecret,
    REFRESH_TOKEN_TTL,
  );

  return {
    accessToken,
    refreshToken,
    refreshExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
};

export const verifyAccessToken = (token: string): AccessPayload => {
  try {
    const payload = jwt.verify(token, readSecret('JWT_ACCESS_SECRET')) as AccessPayload;
    if (payload.type !== 'access') {
      throw new AuthError('Invalid token type');
    }
    return payload;
  } catch (error) {
    if (error instanceof AuthError) throw error;
    throw new AuthError('Invalid or expired access token');
  }
};

