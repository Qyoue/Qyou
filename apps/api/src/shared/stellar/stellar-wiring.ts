/**
 * Explicit wiring for Stellar services (#1150), queue completion hook (#1149) and the reward
 * history route handler (#1148). Not yet used by `bootstrap.ts`, the queue module or
 * `stellar.routes.ts`; those files were not reviewed or changed.
 */
export interface StellarDeps {
  wallets: object;
  incentives: IncentiveLike;
  repository: object;
  killSwitch: object;
  distributionGuard: object;
  abuseDetector: object;
  secrets: object;
}

export interface IncentiveLike {
  reward(input: { userId: string; queueId: string; idempotencyKey: string }): Promise<unknown>;
}

const REQUIRED: Array<keyof StellarDeps> = ['wallets', 'incentives', 'repository', 'killSwitch', 'distributionGuard', 'abuseDetector', 'secrets'];

/** Boot-time validation: refuse to start when a required guard or secret store is missing. */
export function validateStellarDeps(deps: Partial<StellarDeps>): asserts deps is StellarDeps {
  const missing = REQUIRED.filter((k) => !deps[k]);
  if (missing.length) throw new Error(`Stellar services missing required dependencies: ${missing.join(', ')}`);
}

/** Replaces `createStellarServices()`'s no-argument construction. */
export function createStellarServices(deps: Partial<StellarDeps>): StellarDeps {
  validateStellarDeps(deps);
  return deps;
}

/** #1149: call from the queue module when a user is served; the key makes retries harmless. */
export function onQueueServed(incentives: IncentiveLike) {
  return (event: { userId: string; queueId: string; event: string }) =>
    incentives.reward({
      userId: event.userId,
      queueId: event.queueId,
      idempotencyKey: `${event.userId}:${event.queueId}:${event.event}`,
    });
}

// ---- #1148 GET /api/v1/stellar/rewards ----
export interface RewardRow {
  id: string;
  queueId: string;
  amount: unknown;
  asset: string;
  txHash: string | null;
  status: string;
  createdAt: Date;
}

export interface RewardQuery {
  findMany(args: unknown): Promise<RewardRow[]>;
}

/** Cursor pagination, newest first, always scoped to the authenticated user. */
export function rewardHistoryHandler(reward: RewardQuery) {
  return async (
    req: { user?: { id: string }; query: { cursor?: string; limit?: string } },
    res: { status(code: number): { json(b: unknown): unknown }; json(b: unknown): unknown },
  ) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const rows = await reward.findMany({
      where: { userId: req.user.id },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(req.query.cursor ? { cursor: { id: req.query.cursor }, skip: 1 } : {}),
    });
    const page = rows.slice(0, limit);
    return res.json({ data: page, nextCursor: rows.length > limit ? page[page.length - 1].id : null });
  };
}
