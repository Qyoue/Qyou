import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../errors/index.js';

interface AccessTokenPayload {
  sub: string;
  email: string;
  role?: 'USER' | 'OPERATOR' | 'ADMIN';
  iat?: number;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing or invalid Authorization header.');
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role ?? 'USER',
      lastAuthAt: payload.iat ? payload.iat * 1000 : undefined,
    };
    next();
  } catch {
    throw new UnauthorizedError('Invalid or expired token.');
  }
}
