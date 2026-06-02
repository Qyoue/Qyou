const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

import type {
  LoginInput,
  LoginResult,
  PasswordResetConfirmInput,
  PasswordResetConfirmResult,
  PasswordResetRequestInput,
  PasswordResetRequestResult,
  RegistrationInput,
  RegistrationResult,
  VerificationResult,
} from "@qyou/types";

export async function registerAccount(input: RegistrationInput): Promise<RegistrationResult> {
  const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<RegistrationResult>;
}

export async function loginAccount(input: LoginInput): Promise<LoginResult> {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<LoginResult>;
}

export async function requestPasswordReset(email: string): Promise<PasswordResetRequestResult> {
  const input: PasswordResetRequestInput = { email };
  const res = await fetch(`${API_BASE}/api/v1/auth/password-reset/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<PasswordResetRequestResult>;
}

export async function confirmPasswordReset(token: string, newPassword: string): Promise<PasswordResetConfirmResult> {
  const input: PasswordResetConfirmInput = { token, newPassword };
  const res = await fetch(`${API_BASE}/api/v1/auth/password-reset/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return res.json() as Promise<PasswordResetConfirmResult>;
}

export async function verifyEmailToken(token: string): Promise<VerificationResult> {
  const res = await fetch(`${API_BASE}/api/v1/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return res.json() as Promise<VerificationResult>;
}
