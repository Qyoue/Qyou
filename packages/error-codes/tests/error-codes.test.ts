import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ERROR_MESSAGE,
  ERROR_STATUS,
  ErrorCode,
  isErrorCode,
  parseApiError,
  statusFor,
  toApiErrorBody,
} from '../src/index.js';

describe('@qyou/error-codes', () => {
  it('has a status and a message for every code', () => {
    for (const code of Object.values(ErrorCode)) {
      assert.ok(ERROR_STATUS[code] >= 400, `${code} status`);
      assert.ok(ERROR_MESSAGE[code].length > 0, `${code} message`);
    }
  });

  it('keeps the codes the API already returns', () => {
    assert.equal(statusFor(ErrorCode.VALIDATION_ERROR), 400);
    assert.equal(statusFor(ErrorCode.UNAUTHORIZED), 401);
    assert.equal(statusFor(ErrorCode.NOT_FOUND), 404);
    assert.equal(statusFor(ErrorCode.CONFLICT), 409);
    assert.equal(statusFor(ErrorCode.INTERNAL_ERROR), 500);
  });

  it('builds and parses the error envelope', () => {
    const body = toApiErrorBody(ErrorCode.RATE_LIMITED);
    assert.deepEqual(parseApiError(body), { code: 'RATE_LIMITED', message: ERROR_MESSAGE.RATE_LIMITED });
  });

  it('rejects unknown codes and malformed bodies', () => {
    assert.equal(isErrorCode('NOPE'), false);
    assert.equal(parseApiError({ error: { code: 'NOPE', message: 'x' } }), undefined);
    assert.equal(parseApiError(null), undefined);
    assert.equal(parseApiError({ error: 'Unauthorized' }), undefined);
  });
});
