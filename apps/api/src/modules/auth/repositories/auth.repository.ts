import type { PrismaClient, User } from '@prisma/client';
import type {
  AuthActionTokenKind,
  AuthSessionRecord,
  AuthUserRecord,
  CreateUserData,
} from '../types/auth.types.js';

function toAuthUserRecord(user: User): AuthUserRecord {
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    role: user.role ?? 'USER',
    emailVerifiedAt: user.emailVerifiedAt ?? null,
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
  createSession(data: Omit<AuthSessionRecord, 'id' | 'createdAt'>): Promise<void>;
  listActiveSessions(userId: string, now: Date): Promise<AuthSessionRecord[]>;
  touchSession(tokenHash: string, now: Date): Promise<void>;
  revokeSession(tokenHash: string, now: Date): Promise<void>;
  createActionToken(input: {
    tokenHash: string;
    userId: string;
    kind: AuthActionTokenKind;
    expiresAt: Date;
    createdAt: Date;
    cooldownAfter: Date;
  }): Promise<boolean>;
  consumeActionToken(
    tokenHash: string,
    kind: AuthActionTokenKind,
    now: Date,
    newPasswordHash?: string,
  ): Promise<boolean>;
}

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<AuthUserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? toAuthUserRecord(user) : null;
  }

  async create(data: CreateUserData): Promise<AuthUserRecord> {
    const user = await this.prisma.user.create({ data });
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

  async createSession(data: Omit<AuthSessionRecord, 'id' | 'createdAt'>): Promise<void> {
    await this.prisma.authSession.create({ data });
  }

  async listActiveSessions(userId: string, now: Date): Promise<AuthSessionRecord[]> {
    return this.prisma.authSession.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: now } },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        userId: true,
        tokenHash: true,
        expiresAt: true,
        revokedAt: true,
        userAgent: true,
        ip: true,
        lastUsedAt: true,
        createdAt: true,
      },
    });
  }

  async touchSession(tokenHash: string, now: Date): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: now } },
      data: { lastUsedAt: now },
    });
  }

  async revokeSession(tokenHash: string, now: Date): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  async createActionToken(input: {
    tokenHash: string;
    userId: string;
    kind: AuthActionTokenKind;
    expiresAt: Date;
    createdAt: Date;
    cooldownAfter: Date;
  }): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const emailVerification = input.kind === 'EMAIL_VERIFICATION';
      const userWhere = emailVerification
        ? {
            id: input.userId,
            OR: [
              { emailVerificationRequestedAt: null },
              { emailVerificationRequestedAt: { lte: input.cooldownAfter } },
            ],
          }
        : {
            id: input.userId,
            OR: [
              { passwordResetRequestedAt: null },
              { passwordResetRequestedAt: { lte: input.cooldownAfter } },
            ],
          };
      const userData = emailVerification
        ? { emailVerificationRequestedAt: input.createdAt }
        : { passwordResetRequestedAt: input.createdAt };
      const updated = await transaction.user.updateMany({ where: userWhere, data: userData });
      if (updated.count !== 1) return false;

      await transaction.authActionToken.updateMany({
        where: { userId: input.userId, kind: input.kind, consumedAt: null },
        data: { consumedAt: input.createdAt },
      });
      await transaction.authActionToken.create({
        data: {
          tokenHash: input.tokenHash,
          userId: input.userId,
          kind: input.kind,
          expiresAt: input.expiresAt,
          createdAt: input.createdAt,
        },
      });
      return true;
    });
  }

  async consumeActionToken(
    tokenHash: string,
    kind: AuthActionTokenKind,
    now: Date,
    newPasswordHash?: string,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const token = await transaction.authActionToken.findUnique({
        where: { tokenHash },
        select: { id: true, userId: true, kind: true, expiresAt: true, consumedAt: true },
      });
      if (!token || token.kind !== kind || token.consumedAt || token.expiresAt <= now) {
        return false;
      }

      const consumed = await transaction.authActionToken.updateMany({
        where: { id: token.id, kind, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (consumed.count !== 1) return false;

      if (kind === 'PASSWORD_RESET') {
        if (!newPasswordHash)
          throw new Error('A new password hash is required for password reset.');
        await transaction.user.update({
          where: { id: token.userId },
          data: { passwordHash: newPasswordHash },
        });
      } else {
        await transaction.user.update({
          where: { id: token.userId },
          data: { emailVerifiedAt: now },
        });
      }
      return true;
    });
  }
}
