import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../shared/errors/index.js';

export function requireRole(...roles: Array<'USER' | 'OPERATOR' | 'ADMIN'>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;
    if (!user) {
      next(new UnauthorizedError('Missing or invalid Authorization header.'));
      return;
    }
    const role = user.role ?? 'USER';
    if (!roles.includes(role)) {
      next(new ForbiddenError('Insufficient role permissions.'));
      return;
    }
    next();
  };
}

export function requireOperatorRole() {
  return requireRole('OPERATOR', 'ADMIN');
}
