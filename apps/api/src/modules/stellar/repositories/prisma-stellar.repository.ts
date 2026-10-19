/**
 * Prisma-backed Stellar repository (#1134). Structural types are used so the file compiles
 * without the generated client; the Prisma delegates `walletLink` and `stellarAuditLog` must
 * exist (see apps/api/prisma/stellar-persistence.prisma.md for the models).
 */
export interface WalletLinkRow {
  id: string;
  userId: string;
  publicKey: string;
  encryptedSecretKey?: string | null;
  createdAt: Date;
}

export interface AuditRow {
  userId: string;
  action: string;
  metadata?: unknown;
}

interface PrismaLike {
  walletLink: {
    upsert(args: unknown): Promise<WalletLinkRow>;
    findUnique(args: unknown): Promise<WalletLinkRow | null>;
    delete(args: unknown): Promise<unknown>;
  };
  stellarAuditLog: { create(args: { data: AuditRow }): Promise<unknown> };
}

export class PrismaStellarRepository {
  constructor(private readonly prisma: PrismaLike) {}

  saveWalletLink(userId: string, publicKey: string): Promise<WalletLinkRow> {
    return this.prisma.walletLink.upsert({
      where: { userId },
      create: { userId, publicKey },
      update: { publicKey },
    });
  }

  getWalletLink(userId: string): Promise<WalletLinkRow | null> {
    return this.prisma.walletLink.findUnique({ where: { userId } });
  }

  async deleteWalletLink(userId: string): Promise<void> {
    await this.prisma.walletLink.delete({ where: { userId } });
  }

  /** Append-only: there is deliberately no update or delete method. */
  async recordAuditLog(entry: AuditRow): Promise<void> {
    await this.prisma.stellarAuditLog.create({ data: entry });
  }
}

/** Use at router construction: the in-memory repository is for tests and local dev only. */
export function assertPersistentRepository(repo: object, env: string | undefined): void {
  if (env === 'production' && repo.constructor.name === 'InMemoryStellarRepository') {
    throw new Error('InMemoryStellarRepository is not allowed in production; use PrismaStellarRepository');
  }
}
