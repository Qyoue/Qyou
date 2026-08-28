// #828: duplicate-email race condition test
import { AuthService } from '../services/auth.service.js';
import { ConflictError } from '../../../shared/errors/index.js';

jest.mock('../../../shared/config/env.js', () => ({
  env: { JWT_SECRET: 'test-secret', JWT_EXPIRES_IN: '1h' },
}));

function makeRepo(existing = false) {
  let created = false;
  return {
    findByEmail: jest.fn().mockResolvedValue(existing ? { id: 'u1', email: 'a@b.com', passwordHash: 'h', createdAt: new Date(), updatedAt: new Date() } : null),
    create: jest.fn().mockImplementation(async () => {
      if (created) throw new ConflictError('An account with this email already exists.');
      created = true;
      return { id: 'u1', email: 'a@b.com', passwordHash: 'h', createdAt: new Date(), updatedAt: new Date() };
    }),
  };
}

describe('AuthService.register race condition (#828)', () => {
  it('concurrent registrations with same email: exactly one succeeds', async () => {
    const repo = makeRepo();
    const service = new AuthService(repo as any);
    // Fire two concurrent registrations
    const [r1, r2] = await Promise.allSettled([
      service.register({ email: 'a@b.com', password: 'Password1!' }),
      service.register({ email: 'a@b.com', password: 'Password1!' }),
    ]);
    const fulfilled = [r1, r2].filter((r) => r.status === 'fulfilled');
    const rejected = [r1, r2].filter((r) => r.status === 'rejected');
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
    const err = (rejected[0] as PromiseRejectedResult).reason;
    expect(err).toBeInstanceOf(ConflictError);
  });
});
