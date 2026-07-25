import {
  authTokenHeaderSchema,
  type TokenValidationOutcome,
} from '@qyou/shared';

export function validateAuthorizationHeader(authHeader: unknown): TokenValidationOutcome {
  const result = authTokenHeaderSchema.safeParse({ authorization: authHeader });
  if (!result.success) {
    return {
      isValid: false,
      failureReason: result.error.errors[0]?.message ?? 'Invalid header',
    };
  }

  return { isValid: true };
}
