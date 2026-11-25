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
          201: {
            description: 'Account created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } },
            },
          },
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
          200: {
            description: 'Authenticated',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } },
            },
          },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        summary: 'Rotate a refresh token for a new access token pair',
        description:
          'Consumes the presented refresh token and issues new tokens. Reusing the old token returns 401 (#1263).',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TokenRefreshInput' },
            },
          },
        },
        responses: {
          200: {
            description: 'New token pair',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/TokenRefreshResponse' } },
            },
          },
          400: { description: 'Invalid request body' },
          401: { description: 'Invalid, expired, or already used refresh token' },
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
    '/auth/sessions': {
      get: {
        summary: 'List active authentication sessions',
        tags: ['Auth'],
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: 'Active sessions; token values are never included',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['sessions'],
                  properties: {
                    sessions: {
                      type: 'array',
                      items: {
                        type: 'object',
                        required: ['id', 'device', 'lastUsedAt', 'current'],
                        properties: {
                          id: { type: 'string' },
                          device: { type: 'string' },
                          lastUsedAt: { type: 'string', format: 'date-time' },
                          current: { type: 'boolean' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Authentication required' },
        },
      },
    },
    '/auth/email-verification/request': {
      post: {
        summary: 'Request an email verification message',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', format: 'email' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Request accepted' },
          429: { description: 'Too many requests' },
        },
      },
    },
    '/auth/email-verification/confirm': {
      post: {
        summary: 'Confirm an email verification token',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token'],
                properties: { token: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Email verified' },
          400: { description: 'Invalid or expired token' },
        },
      },
    },
    '/auth/password-reset/request': {
      post: {
        summary: 'Request a password reset email',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: { email: { type: 'string', format: 'email' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Request accepted' },
          429: { description: 'Too many requests' },
        },
      },
    },
    '/auth/password-reset/confirm': {
      post: {
        summary: 'Set a new password with a reset token',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['token', 'password'],
                properties: { token: { type: 'string' }, password: { type: 'string' } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password reset' },
          400: { description: 'Invalid or expired token' },
        },
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
      AuthTokens: {
        type: 'object',
        required: ['accessToken'],
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          expiresIn: { type: 'integer' },
        },
      },
      AuthResponse: {
        type: 'object',
        required: ['user', 'tokens'],
        properties: {
          user: {
            type: 'object',
            required: ['id', 'email', 'createdAt', 'updatedAt'],
            properties: {
              id: { type: 'string' },
              email: { type: 'string', format: 'email' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          tokens: { $ref: '#/components/schemas/AuthTokens' },
        },
      },
      TokenRefreshInput: {
        type: 'object',
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string', minLength: 1 } },
      },
      TokenRefreshResponse: {
        type: 'object',
        required: ['tokens'],
        properties: { tokens: { $ref: '#/components/schemas/AuthTokens' } },
      },
    },
  },
} as const;
