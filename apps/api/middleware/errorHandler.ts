import { ErrorRequestHandler } from 'express';
import { Error as MongooseError } from 'mongoose';
import { AppError, ValidationError } from '../errors/AppError';
import { logger } from '../logger';

const toAppError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof MongooseError.ValidationError) {
    return new ValidationError(error.message);
  }

  if (error instanceof MongooseError.CastError) {
    return new ValidationError(`Invalid value for field "${error.path}"`);
  }

  return new AppError('Internal server error', 500, 'INTERNAL_SERVER_ERROR', false);
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  const appError = toAppError(error);
  const statusCode = appError.statusCode || 500;

  logger.error(
    {
      err: error,
      statusCode,
      code: appError.code,
      method: req.method,
      path: req.originalUrl,
    },
    appError.message,
  );

  const isServerError = statusCode >= 500;
  const safeMessage = isServerError ? 'Internal server error' : appError.message;
  const safeCode = isServerError ? 'INTERNAL_SERVER_ERROR' : appError.code;

  res.status(statusCode).json({
    success: false,
    error: {
      code: safeCode,
      message: safeMessage,
    },
  });
};
