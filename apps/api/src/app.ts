import cors from 'cors';
import express, { type Express } from 'express';
import { createAuthRouter } from './modules/auth/routes/auth.routes.js';
import { PrismaAuthRepository } from './modules/auth/repositories/auth.repository.js';
import type { AuthRepository } from './modules/auth/repositories/auth.repository.js';
import { prisma } from './shared/database/prisma.js';
import { errorHandler } from './shared/middleware/error-handler.js';

export interface AppDependencies {
  authRepository?: AuthRepository;
}

export function createApp(deps: AppDependencies = {}): Express {
  const app = express();

  // #839: CSRF strategy — auth uses Bearer tokens in Authorization headers
  // (not cookies), so standard CSRF attacks do not apply. If cookie-based
  // sessions are added in future, add a double-submit cookie or synchroniser
  // token at that point. Document the decision here for reviewers.
  app.use(cors());
  app.use(express.json());

  const authRepository = deps.authRepository ?? new PrismaAuthRepository(prisma);
  app.use('/api/auth', createAuthRouter(authRepository));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(errorHandler);

  return app;
}
