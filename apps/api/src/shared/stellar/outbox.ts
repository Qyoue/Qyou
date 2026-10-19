/**
 * Transactional outbox for reward events (#1147). The outbox row is written in the SAME database
 * transaction as the reward status change, so a crash between payout and notification cannot lose
 * the event; a dispatcher delivers pending rows at-least-once.
 *
 * Needs an `OutboxEvent` table (id, type, payload JSON, createdAt, dispatchedAt NULL, attempts)
 * which is not part of this change. Consumers must be idempotent (key: `id`).
 */
export interface OutboxRow {
  id: string;
  type: string;
  payload: unknown;
  attempts: number;
}

export interface OutboxTx {
  reward: { update(args: unknown): Promise<unknown> };
  outboxEvent: { create(args: { data: { type: string; payload: unknown } }): Promise<unknown> };
}

export interface OutboxDb {
  $transaction<T>(fn: (tx: OutboxTx) => Promise<T>): Promise<T>;
  outboxEvent: {
    findMany(args: unknown): Promise<OutboxRow[]>;
    update(args: unknown): Promise<unknown>;
  };
}

/** Change reward status and enqueue the event atomically. */
export function confirmRewardWithEvent(db: OutboxDb, rewardId: string, txHash: string, event: { type: string; payload: unknown }) {
  return db.$transaction(async (tx) => {
    await tx.reward.update({ where: { id: rewardId }, data: { status: 'CONFIRMED', txHash } });
    await tx.outboxEvent.create({ data: event });
  });
}

/** Deliver pending rows; mark each dispatched only after the handler succeeds. Returns the count delivered. */
export async function dispatchOutbox(db: OutboxDb, deliver: (row: OutboxRow) => Promise<void>, batch = 50): Promise<number> {
  const rows = await db.outboxEvent.findMany({ where: { dispatchedAt: null }, orderBy: { createdAt: 'asc' }, take: batch });
  let delivered = 0;
  for (const row of rows) {
    try {
      await deliver(row);
      await db.outboxEvent.update({ where: { id: row.id }, data: { dispatchedAt: new Date() } });
      delivered += 1;
    } catch {
      await db.outboxEvent.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    }
  }
  return delivered;
}
