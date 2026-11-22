import type {
  AuthResponse,
  LoginInput,
  RegisterInput,
  SessionLifecyclePayload,
  TokenRefreshInput,
  TokenRefreshResponse,
} from '@qyou/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const AUTH_STORAGE_KEY = 'qyou.auth';

type RequestOptions = RequestInit & {
  timeoutMs?: number;
  skipAuthRefresh?: boolean;
};

let refreshPromise: Promise<string | null> | null = null;

function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.tokens?.accessToken ?? parsed?.accessToken ?? null;
  } catch {
    return null;
  }
}

function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.tokens?.refreshToken ?? parsed?.refreshToken ?? null;
  } catch {
    return null;
  }
}

function clearAuthAndRedirect() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  document.cookie = 'qyou_auth=; path=/; Max-Age=0; SameSite=Lax';
  window.dispatchEvent(new Event('qyou:session-expired'));
  if (!window.location.pathname.startsWith('/login')) {
    window.location.assign('/login');
  }
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) return null;
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as any;
      const accessToken = data?.tokens?.accessToken ?? data?.accessToken ?? null;
      if (accessToken && typeof window !== 'undefined') {
        const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.tokens) parsed.tokens.accessToken = accessToken;
          if (data?.tokens?.refreshToken) parsed.tokens.refreshToken = data.tokens.refreshToken;
          window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsed));
        }
      }
      return accessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { timeoutMs = 15000, skipAuthRefresh = false, headers, ...init } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const signal = init.signal
    ? AbortSignal.any([init.signal, controller.signal])
    : controller.signal;

  const token = getStoredAccessToken();
  const mergedHeaders = new Headers(headers);
  if (!mergedHeaders.has('Content-Type') && init.body) mergedHeaders.set('Content-Type', 'application/json');
  if (token && !mergedHeaders.has('Authorization')) mergedHeaders.set('Authorization', `Bearer ${token}`);

  try {
    let response = await fetch(`${API_URL}${path}`, { ...init, headers: mergedHeaders, signal });
    if (response.status === 401 && !skipAuthRefresh) {
      const newToken = await refreshAccessToken();
      if (newToken) {
        const retryHeaders = new Headers(headers);
        if (!retryHeaders.has('Content-Type') && init.body) retryHeaders.set('Content-Type', 'application/json');
        retryHeaders.set('Authorization', `Bearer ${newToken}`);
        response = await fetch(`${API_URL}${path}`, { ...init, headers: retryHeaders, signal });
      } else {
        clearAuthAndRedirect();
        throw new Error('Session expired. Please sign in again.');
      }
    }

    const contentType = response.headers.get('content-type') ?? '';
    const data = contentType.includes('application/json') ? await response.json() : await response.text();
    if (!response.ok) {
      const message =
        typeof (data as any)?.error?.message === 'string'
          ? (data as any).error.message
          : typeof (data as any)?.message === 'string'
            ? (data as any).message
            : 'Something went wrong. Please try again.';
      if (response.status === 401) clearAuthAndRedirect();
      throw new Error(message);
    }
    return data as T;
  } finally {
    clearTimeout(timeout);
  }
}

export async function postJson<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
  return request<T>(path, { ...options, method: 'POST', body: JSON.stringify(body) });
}

export async function getJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return request<T>(path, { ...options, method: 'GET' });
}

export async function putJson<T>(path: string, body: unknown, options: RequestOptions = {}): Promise<T> {
  return request<T>(path, { ...options, method: 'PUT', body: JSON.stringify(body) });
}

export async function deleteJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return request<T>(path, { ...options, method: 'DELETE' });
}

export function login(input: LoginInput): Promise<AuthResponse> {
  return postJson<AuthResponse>('/api/auth/login', input, { skipAuthRefresh: true });
}

export function register(input: RegisterInput): Promise<AuthResponse> {
  return postJson<AuthResponse>('/api/auth/register', input, { skipAuthRefresh: true });
}

export function refreshToken(input: TokenRefreshInput): Promise<TokenRefreshResponse> {
  return postJson<TokenRefreshResponse>('/api/auth/refresh', input, { skipAuthRefresh: true });
}

export function validateSession(sessionId: string): Promise<SessionLifecyclePayload> {
  return postJson<SessionLifecyclePayload>('/api/v1/auth/session/validate', { sessionId });
}
