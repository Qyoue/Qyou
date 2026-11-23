import cors from 'cors';
import helmet from 'helmet';
import express, { type Express } from 'express';
import { rateLimit } from 'express-rate-limit';
import { createAuthRouter } from './modules/auth/routes/auth.routes.js';
import { PrismaAuthRepository } from './modules/auth/repositories/auth.repository.js';
import type { AuthRepository } from './modules/auth/repositories/auth.repository.js';
import { InMemoryAuthRepository } from './modules/auth/repositories/in-memory-auth.repository.js';
import { createStellarRouter } from './modules/stellar/routes/stellar.routes.js';
import { registerOperatorRoutes } from './routes/operatorRoutes.js';
import { setupRewardSseStream } from './events/rewardStatusStream.js';
import type { StellarRepository } from './modules/stellar/repositories/stellar.repository.js';
import { prisma } from './shared/database/prisma.js';
import { errorHandler } from './shared/middleware/error-handler.js';
import { metricsMiddleware, renderMetrics } from './shared/middleware/metrics.js';
import { requestIdMiddleware } from './shared/middleware/request-id.js';
import { env } from './shared/config/env.js';
import { openApiSpec } from './openapi-spec.js';
import { createMailer, type Mailer } from './modules/auth/services/mailer.js';

export interface AppDependencies {
  authRepository?: AuthRepository;
  stellarRepository?: StellarRepository;
  stellarEnabled?: boolean;
  mailer?: Mailer;
}

export function createApp(deps: AppDependencies = {}): Express {
  // #811: never boot production with the in-memory auth repository — it resets
  // state on restart and is intended for tests/local dev only.
  if (deps.authRepository instanceof InMemoryAuthRepository && env.NODE_ENV === 'production') {
    throw new Error(
      'InMemoryAuthRepository must not be used in production. Use PrismaAuthRepository.',
    );
  }

  const app = express();

  app.set('trust proxy', env.TRUST_PROXY);

  // #801: standard security headers (HSTS, X-Content-Type-Options, etc.)
  app.use(helmet());

  // #800: CORS allow-list driven by CORS_ORIGINS env var.
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || env.CORS_ORIGINS.includes(origin)) {
          callback(null, true);
          return;
        }
        if (env.NODE_ENV === 'production') {
          callback(new Error('Origin not allowed by CORS policy.'));
          return;
        }
        callback(null, true);
      },
    }),
  );
  app.use(express.json({ limit: env.BODY_LIMIT }));
  app.use(requestIdMiddleware);
  app.use(metricsMiddleware);

  const authKey = (req: express.Request): string => {
    const ip = req.ip ?? 'unknown-ip';
    const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : '';
    if (req.path.includes('/register')) return ip;
    return email ? `${ip}:${email}` : ip;
  };

  const loginRateLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.AUTH_LOGIN_RATE_LIMIT_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: authKey,
  });

  const registerRateLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.AUTH_REGISTER_RATE_LIMIT_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: authKey,
  });

  const authDefaultRateLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.AUTH_DEFAULT_RATE_LIMIT_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: authKey,
  });

  const authRepository = deps.authRepository ?? new PrismaAuthRepository(prisma);
  const authRouter = createAuthRouter(authRepository, deps.mailer ?? createMailer());
  const emailActionRateLimiter = rateLimit({
    windowMs: env.EMAIL_ACTION_RATE_LIMIT_WINDOW_MS,
    limit: env.EMAIL_ACTION_RATE_LIMIT_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: authKey,
  });

  // All API routes versioned under /api/v1 (#821)
  app.use('/api/v1/auth/email-verification/request', emailActionRateLimiter);
  app.use('/api/v1/auth/password-reset/request', emailActionRateLimiter);
  app.use('/api/v1/auth/email-verification/confirm', emailActionRateLimiter);
  app.use('/api/v1/auth/password-reset/confirm', emailActionRateLimiter);
  app.use('/api/v1/auth/login', loginRateLimiter);
  app.use('/api/v1/auth/register', registerRateLimiter);
  app.use('/api/v1/auth', authDefaultRateLimiter, authRouter);

  // Keep /api/auth as a redirect alias for backwards compatibility during migration
  app.use('/api/auth/email-verification/request', emailActionRateLimiter);
  app.use('/api/auth/password-reset/request', emailActionRateLimiter);
  app.use('/api/auth/email-verification/confirm', emailActionRateLimiter);
  app.use('/api/auth/password-reset/confirm', emailActionRateLimiter);
  app.use('/api/auth/login', loginRateLimiter);
  app.use('/api/auth/register', registerRateLimiter);
  app.use('/api/auth', authDefaultRateLimiter, authRouter);

  // Feature flag check (#959 / Track 1 #11): gate Stellar routes behind STELLAR_INCENTIVES_ENABLED (#1006)
  const stellarEnabled =
    deps.stellarEnabled ??
    (process.env.STELLAR_INCENTIVES_ENABLED === 'true' ||
      process.env.STELLAR_INCENTIVES_ENABLED === '1');

  if (stellarEnabled) {
    const stellarRouter = createStellarRouter({
      stellarRepository: deps.stellarRepository,
    });
    app.use('/api/v1/stellar', stellarRouter);
    app.use('/api/stellar', stellarRouter);
  }

  app.get('/livez', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.get('/readyz', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ status: 'ok', db: 'up', migrations: 'ok' });
    } catch {
      res.status(503).json({ status: 'degraded', db: 'down' });
    }
  });

  // #815: health check for uptime monitors/load balancers — probes DB connectivity.
  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', db: 'up' });
    } catch {
      res.status(503).json({ status: 'degraded', db: 'down' });
    }
  });

  // #817: Prometheus-format metrics for scapers/observability backends.
  app.get('/metrics', (req, res) => {
    const enabled =
      env.METRICS_ENABLED === 'true' ||
      (env.NODE_ENV !== 'production' && env.METRICS_ENABLED !== 'false');
    if (!enabled) {
      res.status(404).json({ error: { message: 'Not found' } });
      return;
    }

    const authHeader = req.header('authorization');
    const tokenOk = env.METRICS_BEARER_TOKEN
      ? authHeader === `Bearer ${env.METRICS_BEARER_TOKEN}`
      : false;
    const ip = req.ip ?? '';
    const allowlisted =
      env.METRICS_ALLOWLIST.length > 0 ? env.METRICS_ALLOWLIST.includes(ip) : false;

    if (env.METRICS_BEARER_TOKEN || env.METRICS_ALLOWLIST.length > 0) {
      if (!tokenOk && !allowlisted) {
        res.status(401).json({ error: { message: 'Unauthorized' } });
        return;
      }
    }

    res.type('text/plain; version=0.0.4').send(renderMetrics());
  });

  app.get('/docs/openapi.json', (_req, res) => {
    res.json(openApiSpec);
  });

  // Serve OpenAPI spec at /docs (#820)
  app.get('/docs', (_req, res) => {
    res.type('html').send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Qyou API Docs</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
      window.ui = SwaggerUIBundle({ url: '/docs/openapi.json', dom_id: '#swagger-ui' });
    </script>
  </body>
</html>`);
  });

  app.use(errorHandler);

  return app;
}
