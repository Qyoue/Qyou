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
