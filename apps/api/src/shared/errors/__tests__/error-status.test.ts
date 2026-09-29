// #824: verify each error subclass maps to the documented HTTP status
import { ValidationError, UnauthorizedError, NotFoundError, ConflictError } from '../errors/index.js';

describe('AppError hierarchy status codes (#824)', () => {
  it('ValidationError → 400', () => expect(new ValidationError('x').statusCode).toBe(400));
  it('UnauthorizedError → 401', () => expect(new UnauthorizedError('x').statusCode).toBe(401));
  it('NotFoundError → 404', () => expect(new NotFoundError('x').statusCode).toBe(404));
  it('ConflictError → 409', () => expect(new ConflictError('x').statusCode).toBe(409));
});
