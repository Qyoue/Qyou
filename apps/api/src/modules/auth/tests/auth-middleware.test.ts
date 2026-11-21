import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { requireAuth } from '../../shared/middleware/auth-middleware.js';

jest.mock('../../shared/config/env.js', () => ({ env: { JWT_SECRET: 'test-secret' } }));

const SECRET = 'test-secret';
const res = {} as Response;
const next = jest.fn() as NextFunction;

function req(auth?: string): Request {
  return { headers: { authorization: auth } } as unknown as Request;
}

beforeEach(() => jest.clearAllMocks());

describe('requireAuth', () => {
  it('calls next for a valid token', () => {
    const token = jwt.sign({ sub: 'u1', email: 'a@b.com' }, SECRET);
    requireAuth(req(`Bearer ${token}`), res, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('throws on missing header', () => {
    expect(() => requireAuth(req(), res, next)).toThrow('Missing or invalid Authorization header.');
  });

  it('throws when header lacks Bearer prefix', () => {
    expect(() => requireAuth(req('Basic abc'), res, next)).toThrow('Missing or invalid');
  });

  it('throws on expired token', () => {
    const token = jwt.sign({ sub: 'u1', email: 'a@b.com' }, SECRET, { expiresIn: -1 });
    expect(() => requireAuth(req(`Bearer ${token}`), res, next)).toThrow('Invalid or expired token.');
  });

  it('throws on malformed token', () => {
    expect(() => requireAuth(req('Bearer notavalidtoken'), res, next)).toThrow('Invalid or expired token.');
  });
});
