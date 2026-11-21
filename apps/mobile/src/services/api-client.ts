import { API_BASE_URL } from "../config/env";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private refreshTokenHandler?: () => Promise<string | null>;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  setAuthToken(token: string | null) {
    this.token = token;
  }

  setRefreshTokenHandler(handler: () => Promise<string | null>) {
    this.refreshTokenHandler = handler;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { timeoutMs = 15000, ...fetchOptions } = options;
    const url = path.startsWith("http") ? path : `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      let res = await fetch(url, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      if (res.status === 401 && this.refreshTokenHandler) {
        const newToken = await this.refreshTokenHandler();
        if (newToken) {
          this.token = newToken;
          headers["Authorization"] = `Bearer ${newToken}`;
          res = await fetch(url, {
            ...fetchOptions,
            headers,
          });
        }
      }

      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        throw new ApiError(errorBody?.message ?? `Request failed with status ${res.status}`, res.status, errorBody);
      }

      return (await res.json()) as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  async post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
