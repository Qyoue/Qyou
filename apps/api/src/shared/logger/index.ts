import { requestContext } from './request-context.js';

function requestId(): string {
  const ctx = requestContext.getStore();
  return ctx ? ` [req:${ctx.requestId}]` : '';
}

export const logger = {
  info: (...args: unknown[]): void => {
    console.log(`[info]${requestId()}`, ...args);
  },
  warn: (...args: unknown[]): void => {
    console.warn(`[warn]${requestId()}`, ...args);
  },
  error: (...args: unknown[]): void => {
    console.error(`[error]${requestId()}`, ...args);
  },
};
