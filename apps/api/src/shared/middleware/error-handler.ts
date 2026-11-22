import { ErrorCode } from '@qyou/error-codes';
import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/index.js';
import { logger } from '../logger/index.js';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const anyErr = err as { type?: string; status?: number; statusCode?: number };
  if (anyErr?.type === 'entity.too.large' || anyErr?.status === 413 || anyErr?.statusCode === 413) {
    res.status(413).json({
      error: { code: ErrorCode.VALIDATION_ERROR, message: 'Request body too large.' },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid request data.',
        details: err.issues,
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: { code: err.code, message: err.message },
    });
    return;
  }

  logger.error('Unhandled error', err);
  res.status(500).json({
    error: { code: ErrorCode.INTERNAL_ERROR, message: 'Internal server error.' },
  });
}
