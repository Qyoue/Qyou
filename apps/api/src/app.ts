import cors from 'cors';
import helmet from 'helmet';
import express, { type Express } from 'express';
import { rateLimit } from 'express-rate-limit';
import { createAuthRouter } from './modules/auth/routes/auth.routes.js';
import { PrismaAuthRepository } from './modules/auth/repositories/auth.repository.js';
import type { AuthRepository } from './modules/auth/repositories/auth.repository.js';
import { prisma } from './shared/database/prisma.js';
import { errorHandler } from './shared/middleware/error-handler.js';
import { env } from './shared/config/env.js';

export interface AppDependencies {
  authRepository?: AuthRepository;
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

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Serve OpenAPI spec at /docs (#820)
  app.get('/docs', (_req, res) => {
    res.json(openApiSpec);
  });

  app.use(errorHandler);

  return app;
}
