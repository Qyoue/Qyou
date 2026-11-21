import { requestContext } from './request-context.js';
import { sanitizeLogData } from '@qyou/stellar';

function requestId(): string {
  const ctx = requestContext.getStore();
  return ctx ? ` [req:${ctx.requestId}]` : '';
}

function cleanArgs(args: unknown[]): unknown[] {
  return args.map((arg) => sanitizeLogData(arg));
}

export const logger = {
  info: (...args: unknown[]): void => {
    console.log(`[info]${requestId()}`, ...cleanArgs(args));
  },
  warn: (...args: unknown[]): void => {
    console.warn(`[warn]${requestId()}`, ...cleanArgs(args));
  },
  error: (...args: unknown[]): void => {
    console.error(`[error]${requestId()}`, ...cleanArgs(args));
  },
};
