import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Request, Response } from 'express';
import { errorHandler } from '../middleware/error-handler.js';

describe('errorHandler (#802)', () => {
  const makeRes = () => {
    const body: Record<string, unknown> = {};
    return {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: Record<string, unknown>) {
        Object.assign(body, payload);
        return this;
      },
      body,
    } as unknown as Response & { body: Record<string, unknown> };
  };

  it('returns a generic 500 body with no stack trace for unexpected errors', () => {
    const res = makeRes();
    errorHandler(new Error('boom'), {} as Request, res, () => {});

    assert.equal(res.statusCode, 500);
    assert.equal(res.body.error.code, 'INTERNAL_ERROR');
    assert.equal(res.body.error.message, 'Internal server error.');
    assert.ok(!JSON.stringify(res.body).includes('boom'));
    assert.ok(!JSON.stringify(res.body).includes('Error:'));
  });
});
