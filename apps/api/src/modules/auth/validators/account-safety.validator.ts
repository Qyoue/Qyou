import {
  emailVerificationSchema,
  passwordStrengthAuditSchema,
} from '@qyou/shared';

export function validateEmailVerificationRequest(data: unknown) {
  return emailVerificationSchema.safeParse(data);
}

export function validatePasswordAuditRequest(data: unknown) {
  return passwordStrengthAuditSchema.safeParse(data);
}
