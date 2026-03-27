import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { AuthError, AppError } from '../errors/AppError';

type AccessPayload = {
  type: 'access';
  sub: string;
  role: 'USER' | 'ADMIN';
};

const readSecret = (name: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET') => {
  const secret = process.env[name];
  if (!secret || secret.length < 32) {
    throw new AppError(`${name} is not configured`, 500, 'AUTH_CONFIG_ERROR');
  }
  return secret;
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

export const hashToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

