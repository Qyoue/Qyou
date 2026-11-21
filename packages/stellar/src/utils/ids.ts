import { randomUUID } from 'node:crypto';

export const newId = (prefix: string): string => `${prefix}-${randomUUID()}`;
