import { Request, RequestHandler } from 'express';
import { AuthError } from '../errors/AppError';
import { verifyAccessToken } from '../auth/tokens';

type AuthenticatedAccess = {
  userId: string;
  role: 'USER' | 'ADMIN';
};

export type AuthenticatedRequest = Request & {
  auth: AuthenticatedAccess;
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith('Bearer ')) {
    return next(new AuthError('Missing bearer token'));
  }

  const token = authorization.replace('Bearer ', '').trim();

  try {
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
