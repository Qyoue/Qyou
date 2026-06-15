import type { PrismaClient } from '@prisma/client';
import type { AuthUserRecord, CreateUserData } from '../types/auth.types.js';

export interface AuthRepository {
  findByEmail(email: string): Promise<AuthUserRecord | null>;
  create(data: CreateUserData): Promise<AuthUserRecord>;
}

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<AuthUserRecord | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(data: CreateUserData): Promise<AuthUserRecord> {
    return this.prisma.user.create({ data });
  }
}
