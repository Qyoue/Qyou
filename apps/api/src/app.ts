import cors from 'cors';
import helmet from 'helmet';
import express, { type Express } from 'express';
import { rateLimit } from 'express-rate-limit';
import { createAuthRouter } from './modules/auth/routes/auth.routes.js';
import { PrismaAuthRepository } from './modules/auth/repositories/auth.repository.js';
import type { AuthRepository } from './modules/auth/repositories/auth.repository.js';
import { InMemoryAuthRepository } from './modules/auth/repositories/in-memory-auth.repository.js';
import { createStellarRouter } from './modules/stellar/routes/stellar.routes.js';
import type { StellarRepository } from './modules/stellar/repositories/stellar.repository.js';
import { prisma } from './shared/database/prisma.js';
import { errorHandler } from './shared/middleware/error-handler.js';
import { metricsMiddleware, renderMetrics } from './shared/middleware/metrics.js';
import { requestIdMiddleware } from './shared/middleware/request-id.js';
import { env } from './shared/config/env.js';

export interface AppDependencies {
  authRepository?: AuthRepository;
  stellarRepository?: StellarRepository;
  stellarEnabled?: boolean;
}

/**
 * OpenAPI 3.1 spec for the Qyou API (#820).
 * All routes are mounted at /api/v1/... (#821).
 * Update this object whenever a route is added or modified.
 */
const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Qyou API',
    version: '1.0.0',
    description: 'Authentication and queue management API for Qyou.',
  },
  servers: [{ url: '/api/v1', description: 'Current version' }],
  paths: {
    '/auth/register': {
      post: {
        summary: 'Register a new account',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterInput' },
            },
          },
        },
        responses: {
          201: { description: 'Account created', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          409: { description: 'Email already registered' },
        },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Log in with email and password',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginInput' },
            },
          },
        },
        responses: {
          200: { description: 'Authenticated', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/logout': {
      post: {
        summary: 'Log out (invalidate session)',
        tags: ['Auth'],
        responses: { 200: { description: 'Logged out' } },
      },
    },
    '/stellar/wallet': {
      post: {
        summary: 'Link a Stellar public key to user account',
        tags: ['Stellar'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['publicKey'],
                properties: {
                  publicKey: { type: 'string', pattern: '^G[A-Z2-7]{55}$' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Wallet linked successfully' },
          400: { description: 'Invalid Stellar public key' },
          409: { description: 'Wallet already linked' },
        },
      },
      get: {
        summary: 'Get linked Stellar wallet and cached balances',
        tags: ['Stellar'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: 'Wallet details with balances' },
          404: { description: 'No wallet linked' },
        },
      },
      delete: {
        summary: 'Unlink a linked Stellar wallet with re-authentication',
        tags: ['Stellar'],
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  password: { type: 'string' },
                  reauthConfirmed: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Wallet unlinked successfully' },
          401: { description: 'Re-authentication required' },
          404: { description: 'No wallet linked' },
        },
      },
    },
  },
  components: {
    schemas: {
      RegisterInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
        },
      },
      LoginInput: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      AuthResponse: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
            },
          },
        },
      },
    },
  },
};

export function createApp(deps: AppDependencies = {}): Express {
  // #811: never boot production with the in-memory auth repository — it resets
  // state on restart and is intended for tests/local dev only.
  if (deps.authRepository instanceof InMemoryAuthRepository && env.NODE_ENV === 'production') {
    throw new Error(
      'InMemoryAuthRepository must not be used in production. Use PrismaAuthRepository.',
    );
  }

  const app = express();

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
  app.use(express.json());
  app.use(requestIdMiddleware);
  app.use(metricsMiddleware);

  // #799: rate-limit auth routes to mitigate brute-force attempts.
  const authRateLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    limit: env.RATE_LIMIT_MAX,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  });

  const authRepository = deps.authRepository ?? new PrismaAuthRepository(prisma);

  // All API routes versioned under /api/v1 (#821)
  app.use('/api/v1/auth', authRateLimiter, createAuthRouter(authRepository));

  // Keep /api/auth as a redirect alias for backwards compatibility during migration
  app.use('/api/auth', authRateLimiter, createAuthRouter(authRepository));

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
  app.get('/metrics', (_req, res) => {
    res.type('text/plain; version=0.0.4').send(renderMetrics());
  });

  // Serve OpenAPI spec at /docs (#820)
  app.get('/docs', (_req, res) => {
    res.json(openApiSpec);
  });

  app.use(errorHandler);

  return app;
}
