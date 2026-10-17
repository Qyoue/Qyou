import { z } from 'zod';

export const tokenRotationClaimSchema = z.object({
  jti: z.string().min(1, 'Token JTI is required.'),
  sub: z.string().min(1, 'Subject claim is required.'),
  iat: z.number().positive(),
  exp: z.number().positive(),
  rotationCount: z.number().int().min(0).default(0),
});

export const authTokenHeaderSchema = z.object({
  authorization: z
    .string()
    .regex(/^Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/, 'Invalid authorization header format.'),
});

export type TokenRotationClaimInput = z.infer<typeof tokenRotationClaimSchema>;
export type AuthTokenHeaderInput = z.infer<typeof authTokenHeaderSchema>;
