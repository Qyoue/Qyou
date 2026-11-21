import { Router } from 'express';
import { StellarController } from '../controllers/stellar.controller.js';
import { StellarApiService } from '../services/stellar.service.js';
import type { RewardSource } from '../services/stellar.service.js';
import { InMemoryStellarRepository } from '../repositories/stellar.repository.js';
import type { StellarRepository } from '../repositories/stellar.repository.js';
import { requireAuth } from '../../../shared/middleware/auth-middleware.js';
import { rateLimit, requireRecentAuth } from './stellar-hardening.js';

export interface StellarRouterDependencies {
  stellarRepository?: StellarRepository;
  stellarService?: StellarApiService;
  /** Source of reward history for GET /rewards (the incentive service or a database-backed store). */
  rewardSource?: RewardSource;
  /** Max age of the access token for unlinking a wallet (#1154). Default 15 minutes. */
  unlinkReauthMinutes?: number;
  /** Per-window request limits for the wallet mutations (#1153). */
  rateLimit?: { windowMs: number; perUser: number; perIp: number };
}

const PRODUCTION_LIKE = new Set(['production', 'staging']);

export function createStellarRouter(deps: StellarRouterDependencies = {}): Router {
  if (!deps.stellarRepository && !deps.stellarService && PRODUCTION_LIKE.has(process.env.NODE_ENV ?? '')) {
    throw new Error(
      `createStellarRouter: refusing the in-memory repository in ${process.env.NODE_ENV}; pass a persistent stellarRepository`,
    );
  }
  const repository = deps.stellarRepository ?? new InMemoryStellarRepository();
  const service = deps.stellarService ?? new StellarApiService(repository, undefined, deps.rewardSource);
  const controller = new StellarController(service);

  const limits = deps.rateLimit ?? { windowMs: 60_000, perUser: 20, perIp: 60 };
  // One limiter instance per action so link and unlink are counted separately.
  const linkLimit = rateLimit(limits);
  const unlinkLimit = rateLimit(limits);
  const reauth = requireRecentAuth(deps.unlinkReauthMinutes ?? 15);

  const router = Router();

  // Wallet management routes protected by auth middleware. The hardening
  // middleware (stellar-hardening.ts) runs after authentication so it can key on the user.
  router.post('/wallet', requireAuth, linkLimit as never, controller.linkWallet);
  router.get('/wallet', requireAuth, controller.getWallet);
  router.delete('/wallet', requireAuth, unlinkLimit as never, reauth as never, controller.unlinkWallet);
  router.get('/rewards', requireAuth, controller.getRewardHistory);

  return router;
}
