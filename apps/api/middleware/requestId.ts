import { RequestHandler } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../logger';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Attaches a request ID to every incoming request.
 * Reads `x-request-id` from the incoming headers (e.g. set by a load balancer)
 * or generates a new UUID. The ID is forwarded in the response header and
 * bound to the logger child so every log line carries it.
 */
export const requestId: RequestHandler = (req, res, next) => {
  const id = (req.headers[REQUEST_ID_HEADER] as string | undefined) ?? randomUUID();

  req.requestId = id;
  res.setHeader(REQUEST_ID_HEADER, id);

  // Bind request-scoped logger so downstream code can use req.log
  (req as unknown as Record<string, unknown>).log = logger.child({ requestId: id });

  next();
};

/** Pull the request ID off a request, falling back to 'unknown'. */
export const getRequestId = (req: { requestId?: string }): string =>
  req.requestId ?? 'unknown';
