import { Response } from 'express';

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface ErrorEnvelope {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export const ok = <T>(res: Response, data: T, meta?: Record<string, unknown>, status = 200) =>
  res.status(status).json({ success: true, data, ...(meta ? { meta } : {}) } satisfies SuccessEnvelope<T>);

export const created = <T>(res: Response, data: T) => ok(res, data, undefined, 201);

export const noContent = (res: Response) => res.status(204).send();

export const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ success: false, error: { code, message } } satisfies ErrorEnvelope);

export const badRequest = (res: Response, message: string, code = 'BAD_REQUEST') =>
  fail(res, 400, code, message);

export const unauthorized = (res: Response, message = 'Unauthorized', code = 'UNAUTHORIZED') =>
  fail(res, 401, code, message);

export const forbidden = (res: Response, message = 'Forbidden', code = 'FORBIDDEN') =>
  fail(res, 403, code, message);

export const notFound = (res: Response, message = 'Not found', code = 'NOT_FOUND') =>
  fail(res, 404, code, message);

export const serverError = (res: Response, message = 'Internal server error') =>
  fail(res, 500, 'INTERNAL_SERVER_ERROR', message);
