const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export type RegistrationInput = {
  email: string;
  password: string;
  displayName?: string;
};

export type RegistrationResult =
  | { ok: true; accountId: string; email: string; status: string }
  | { ok: false; code: string; message: string };

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginResult =
  | { ok: true; accountId: string; email: string; tokens: { accessToken: string; expiresAt: string; refreshToken: string } }
  | { ok: false; code: string; message: string };

export type ResetRequestResult = { ok: true } | { ok: false; code: string; message: string };
export type ResetConfirmResult = { ok: true } | { ok: false; code: string; message: string };
export type VerifyResult = { ok: true; accountId: string; email: string } | { ok: false; code: string; message: string };

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
