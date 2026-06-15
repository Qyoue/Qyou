import type { AuthResponse, LoginInput, RegisterInput } from '@qyou/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    const message =
      typeof data?.error?.message === 'string'
        ? data.error.message
        : 'Something went wrong. Please try again.';
    throw new Error(message);
  }

  return data as T;
}

export function login(input: LoginInput): Promise<AuthResponse> {
  return postJson<AuthResponse>('/api/auth/login', input);
}

export function register(input: RegisterInput): Promise<AuthResponse> {
  return postJson<AuthResponse>('/api/auth/register', input);
}
