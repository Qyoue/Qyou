import type { PrismaClient } from '@prisma/client';
import type { AuthUserRecord, CreateUserData } from '../types/auth.types.js';

function toAuthUserRecord(user: any): AuthUserRecord {
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    role: user.role ?? 'USER',
    deactivatedAt: user.deactivatedAt ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export interface AuthRepository {
  findByEmail(email: string): Promise<AuthUserRecord | null>;
  create(data: CreateUserData): Promise<AuthUserRecord>;
  deactivate(id: string): Promise<AuthUserRecord>;
  deleteAccount(id: string): Promise<void>;
}

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<AuthUserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? toAuthUserRecord(user) : null;
  }

  async create(data: CreateUserData): Promise<AuthUserRecord> {
    const user = await this.prisma.user.create({ data: data as any });
    return toAuthUserRecord(user);
  }

  async deactivate(id: string): Promise<AuthUserRecord> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { deactivatedAt: new Date() },
    });
    return toAuthUserRecord(user);
  }

  async deleteAccount(id: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.walletLink.deleteMany({ where: { userId: id } }),
      this.prisma.user.delete({ where: { id } }),
    ]);
  }
}
