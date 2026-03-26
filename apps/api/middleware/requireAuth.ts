import { Request, RequestHandler } from 'express';
import { verifyAccessToken } from '../auth/tokens';
import { AuthError } from '../errors/AppError';

export type AuthenticatedRequest = Request & {
  auth: {
    userId: string;
    role: 'USER' | 'ADMIN';
  };
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return next(new AuthError('Missing bearer token'));
  }

  try {
    const token = authorization.replace('Bearer ', '').trim();
    const payload = verifyAccessToken(token);
    (req as AuthenticatedRequest).auth = {
      userId: payload.sub,
      role: payload.role,
    };
    return next();
  } catch (error) {
    return next(error);
  }
};

