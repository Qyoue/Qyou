import { ErrorCode, ERROR_STATUS } from '@qyou/error-codes';

// #824: HTTP status code mapping for each error subclass:
// | Class              | statusCode | code              |
// |--------------------|-----------|-------------------|
// | ValidationError    |    400    | VALIDATION_ERROR  |
// | UnauthorizedError  |    401    | UNAUTHORIZED      |
// | NotFoundError      |    404    | NOT_FOUND         |
// | ConflictError      |    409    | CONFLICT          |
// | AppError (base)    | varies    | varies            |
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(ERROR_STATUS[ErrorCode.VALIDATION_ERROR], message, ErrorCode.VALIDATION_ERROR);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(ERROR_STATUS[ErrorCode.CONFLICT], message, ErrorCode.CONFLICT);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Invalid credentials') {
    super(ERROR_STATUS[ErrorCode.UNAUTHORIZED], message, ErrorCode.UNAUTHORIZED);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(ERROR_STATUS[ErrorCode.NOT_FOUND], message, ErrorCode.NOT_FOUND);
  }
}
