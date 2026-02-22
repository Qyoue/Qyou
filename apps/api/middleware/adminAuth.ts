import jwt from 'jsonwebtoken';
import { RequestHandler } from 'express';
import { AuthError, AppError } from '../errors/AppError';

type AccessPayload = {
  type: 'access';
  sub: string;
  role: 'USER' | 'ADMIN';
};

const readAccessSecret = () => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret || secret.length < 32) {
    throw new AppError('JWT_ACCESS_SECRET is not configured', 500, 'AUTH_CONFIG_ERROR');
  }
  return secret;
};

export const requireAdmin: RequestHandler = (req, _res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return next(new AuthError('Missing bearer token'));
  }

  const token = authorization.replace('Bearer ', '').trim();

  try {
    const payload = jwt.verify(token, readAccessSecret()) as AccessPayload;
    if (payload.type !== 'access' || payload.role !== 'ADMIN') {
      return next(new AuthError('Admin access required'));
    }
    return next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }
    return next(new AuthError('Invalid or expired access token'));
  }
};
