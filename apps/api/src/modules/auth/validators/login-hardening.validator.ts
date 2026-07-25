import {
  hardenedLoginSchema,
  hardenedRegistrationSchema,
} from '@qyou/shared';

export function validateHardenedRegistration(data: unknown) {
  return hardenedRegistrationSchema.safeParse(data);
}

export function validateHardenedLogin(data: unknown) {
  return hardenedLoginSchema.safeParse(data);
}
