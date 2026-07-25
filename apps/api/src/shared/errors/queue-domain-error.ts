import type { QueueErrorCode, QueueErrorPayload } from '@qyou/shared';

export class QueueDomainError extends Error {
  public readonly code: QueueErrorCode;
  public readonly statusCode: number;

  constructor(code: QueueErrorCode, message: string, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, QueueDomainError.prototype);
  }

  public toPayload(): QueueErrorPayload {
    return {
      code: this.code,
      message: this.message,
    };
  }
}
