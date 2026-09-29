import type {
  AuthResponse,
  LoginInput,
  RegisterInput,
  SessionLifecyclePayload,
  TokenRefreshInput,
  TokenRefreshResponse,
} from '@qyou/shared';

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

// TODO(#831): refreshToken calls POST /api/auth/refresh which does not exist yet.
// This function will throw a 404 at runtime until the backend route ships.
// Track: https://github.com/Qyoue/Qyou/issues/831
export function refreshToken(input: TokenRefreshInput): Promise<TokenRefreshResponse> {
  return postJson<TokenRefreshResponse>('/api/auth/refresh', input);
}

// TODO(#831): validateSession calls POST /api/auth/session/validate which does not exist yet.
// This function will throw a 404 at runtime until the backend route ships.
// Track: https://github.com/Qyoue/Qyou/issues/831
export function validateSession(sessionId: string): Promise<SessionLifecyclePayload> {
  return postJson<SessionLifecyclePayload>('/api/auth/session/validate', { sessionId });
}

