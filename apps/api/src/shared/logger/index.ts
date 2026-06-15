export const logger = {
  info: (...args: unknown[]): void => {
    console.log('[info]', ...args);
  },
  warn: (...args: unknown[]): void => {
    console.warn('[warn]', ...args);
  },
  error: (...args: unknown[]): void => {
    console.error('[error]', ...args);
  },
};
