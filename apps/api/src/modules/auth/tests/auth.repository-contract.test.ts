import assert from 'node:assert/strict';
import { after, beforeEach, describe, it } from 'node:test';
import { InMemoryAuthRepository } from '../repositories/in-memory-auth.repository.js';
import type { AuthRepository } from '../repositories/auth.repository.js';

async function runContract(name: string, getRepo: () => Promise<AuthRepository> | AuthRepository, cleanup?: () => Promise<void>) {
  describe(`AuthRepository contract (${name})`, () => {
    let repo: AuthRepository;
    beforeEach(async () => {
      if (cleanup) await cleanup();
      repo = await getRepo();
    });

    it('creates and finds user by email', async () => {
      const created = await repo.create({ email: `${name}-user@example.com`, passwordHash: 'hash' });
      const found = await repo.findByEmail(`${name}-user@example.com`);
      assert.ok(found);
      assert.equal(found?.id, created.id);
    });

    it('deactivates user', async () => {
      const created = await repo.create({ email: `${name}-deact@example.com`, passwordHash: 'hash' });
      const deactivated = await repo.deactivate(created.id);
      assert.ok(deactivated.deactivatedAt);
    });

    it('deletes account', async () => {
      const created = await repo.create({ email: `${name}-delete@example.com`, passwordHash: 'hash' });
      await repo.deleteAccount(created.id);
      const found = await repo.findByEmail(`${name}-delete@example.com`);
      assert.equal(found, null);
    });
  });
}

await runContract('in-memory', () => new InMemoryAuthRepository());

if (process.env.DATABASE_URL) {
  const { PrismaClient } = await import('@prisma/client');
  const { PrismaAuthRepository } = await import('../repositories/auth.repository.js');
  const prisma = new PrismaClient();
  const repo = new PrismaAuthRepository(prisma);
  await runContract('prisma', () => repo, async () => {
    await prisma.walletLink.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe('PrismaAuthRepository account deletion (#1296)', () => {
    beforeEach(async () => {
      await prisma.walletLink.deleteMany({});
      await prisma.user.deleteMany({});
    });
    it('cascades wallet links', async () => {
      const user = await repo.create({ email: 'cascade@example.com', passwordHash: 'hash' });
      await prisma.walletLink.create({
        data: { sessionId: 's1', userId: user.id, publicKey: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF', network: 'TESTNET' },
      });
      await repo.deleteAccount(user.id);
      const links = await prisma.walletLink.findMany({ where: { userId: user.id } });
      assert.equal(links.length, 0);
    });
  });

  after(async () => { await prisma.$disconnect(); });
} else {
  describe('AuthRepository contract (prisma)', () => {
    it('skipped: DATABASE_URL not set', { skip: true }, () => {});
  });
}
