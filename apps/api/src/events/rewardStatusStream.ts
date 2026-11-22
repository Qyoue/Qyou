import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../shared/middleware/auth-middleware.js';

interface RewardEvent {
  id: number;
  userId: string;
  data: Record<string, unknown>;
}

const events: RewardEvent[] = [];
let nextId = 1;

export function publishRewardEvent(userId: string, data: Record<string, unknown>) {
  const evt: RewardEvent = { id: nextId++, userId, data };
  events.push(evt);
  return evt;
}

export function resetRewardStreamForTests() {
  events.length = 0;
  nextId = 1;
}

export function setupRewardSseStream(options?: { heartbeatMs?: number }): Router {
  const heartbeatMs = options?.heartbeatMs ?? 15000;
  const router = Router();

  router.get('/rewards/stream', requireAuth, (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).end();
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const lastEventId = Number(req.header('last-event-id') ?? 0);
    const replay = events.filter((e) => e.userId === userId && e.id > lastEventId);
    for (const e of replay) {
      res.write(`id: ${e.id}\n`);
      res.write(`data: ${JSON.stringify(e.data)}\n\n`);
    }

    let lastSent = replay.length ? replay[replay.length - 1].id : lastEventId;
    const interval = setInterval(() => {
      const pending = events.filter((e) => e.userId === userId && e.id > lastSent);
      for (const e of pending) {
        res.write(`id: ${e.id}\n`);
        res.write(`data: ${JSON.stringify(e.data)}\n\n`);
        lastSent = e.id;
      }
      res.write(': heartbeat\n\n');
    }, heartbeatMs);

    req.on('close', () => {
      clearInterval(interval);
      res.end();
    });
  });

  return router;
}
