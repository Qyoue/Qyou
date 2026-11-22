/**
 * OpenAPI 3.1 spec for the Qyou API.
 * Generated artifact companion: apps/api/openapi.json
 * Keep in sync via `npm run openapi:generate -w @qyou/api`.
 */
export const openApiSpec = {
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
} as const;
