import type { NextFunction, Request, Response } from 'express';
import { UnauthorizedError, ForbiddenError } from '../shared/errors/index.js';

export function requireRole(...roles: Array<'USER' | 'OPERATOR' | 'ADMIN'>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user as (Request['user'] & { role?: string }) | undefined;
    if (!user) {
      next(new UnauthorizedError('Missing or invalid Authorization header.'));
      return;
    }
    const role = user.role ?? 'USER';
    if (!roles.includes(role as any)) {
      next(new ForbiddenError('Insufficient role permissions.'));
      return;
    }
    next();
  };
}

export function requireOperatorRole() {
  return requireRole('OPERATOR', 'ADMIN');
}
