import { requireEmail, requireString, requireMinLength } from './validation';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

export interface RefreshInput {
  refreshToken: string;
}

/** Validates and normalises a login request body. */
export const parseLoginInput = (body: Record<string, unknown>): LoginInput => ({
  email: requireEmail(body.email),
  password: requireString(body.password, 'password'),
});

/** Validates and normalises a register request body. */
export const parseRegisterInput = (body: Record<string, unknown>): RegisterInput => ({
  email: requireEmail(body.email),
  password: requireMinLength(requireString(body.password, 'password'), 'password', 8),
  name: requireMinLength(requireString(body.name, 'name'), 'name', 2),
});

/** Validates and normalises a token-refresh request body. */
export const parseRefreshInput = (body: Record<string, unknown>): RefreshInput => ({
  refreshToken: requireString(body.refreshToken, 'refreshToken'),
});
