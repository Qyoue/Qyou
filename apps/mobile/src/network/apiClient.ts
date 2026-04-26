import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import NetInfo from "@react-native-community/netinfo";
import { enqueueRequest, flushQueuedRequests, getPendingQueueCount } from "./offlineQueue";
import { getQueueState, setQueueState } from "./queueState";
import { QueuedRequest, isQueueableMethod } from "./types";
import { getStoredSessionTokens } from "@/src/auth/secureTokens";
import { clearExpiredSession, refreshSessionTokens } from "@/src/auth/sessionRefresh";

const baseURL = process.env.EXPO_PUBLIC_API_URL;
if (!baseURL) {
  throw new Error("EXPO_PUBLIC_API_URL is required");
}

export const apiClient: AxiosInstance = axios.create({
  baseURL,
  timeout: 10000,
});

const createQueuedResponse = (config: InternalAxiosRequestConfig): AxiosResponse => ({
  data: {
    success: true,
    queued: true,
    message: "Request queued offline and will sync on reconnect.",
  },
  status: 202,
  statusText: "Accepted",
  headers: {},
  config,
});

const isNetworkFailure = (error: AxiosError): boolean => {
  if (error.response) return false;
  const code = error.code || "";
  return code.includes("NETWORK") || code.includes("ECONN") || code === "ERR_NETWORK" || !error.response;
};

const toQueuedRequest = (config: InternalAxiosRequestConfig): QueuedRequest => {
  const method = config.method?.toLowerCase();
  if (!isQueueableMethod(method)) {
    throw new Error("Method is not queueable");
  }

  const headers =
    config.headers && typeof config.headers.toJSON === "function"
      ? (config.headers.toJSON() as Record<string, string>)
      : (config.headers as unknown as Record<string, string> | undefined);

  return {
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    method,
    url: config.url || "/",
    headers,
    params: (config.params || {}) as Record<string, unknown>,
    data: config.data,
    timeout: config.timeout,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
};

let initialized = false;
let unsubscribeNetInfo: (() => void) | null = null;
let responseInterceptorId: number | null = null;
let requestInterceptorId: number | null = null;
let initializationPromise: Promise<void> | null = null;

export const initializeApiClient = async () => {
  if (initialized) {
    return;
  }
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    initialized = true;

    const pendingCount = await getPendingQueueCount();
    setQueueState({ pendingCount });

    const current = await NetInfo.fetch();
    const initialOnline = Boolean(current.isConnected && current.isInternetReachable !== false);
    setQueueState({ isOnline: initialOnline });

    if (initialOnline) {
      await flushQueuedRequests(apiClient);
    }

    requestInterceptorId = apiClient.interceptors.request.use(
      async (config) => {
        const stored = await getStoredSessionTokens();
        if (stored.accessToken) {
          config.headers.set("Authorization", `Bearer ${stored.accessToken}`);
        }
        if (stored.deviceId) {
          config.headers.set("x-device-id", stored.deviceId);
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    responseInterceptorId = apiClient.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config;
        if (!config) {
          return Promise.reject(error);
        }

        if (shouldAttemptSessionRefresh(error, config)) {
          const refreshed = await refreshSessionTokens();
          if (refreshed.success) {
            config.headers.set("Authorization", `Bearer ${refreshed.accessToken}`);
            setRetryAuthRefresh(config, true);
            return apiClient.request(config);
          }

          await clearExpiredSession();
          return Promise.reject(error);
        }

        if (hasSkipQueueFlag(config)) {
          return Promise.reject(error);
        }
        if (!isQueueableMethod(config.method)) {
          return Promise.reject(error);
        }
        if (!isNetworkFailure(error)) {
          return Promise.reject(error);
        }

        await enqueueRequest(toQueuedRequest(config));
        return Promise.resolve(createQueuedResponse(config));
      },
    );

    unsubscribeNetInfo = NetInfo.addEventListener(async (state) => {
      const nowOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
      const previousOnline = getQueueState().isOnline;
      setQueueState({ isOnline: nowOnline });

      if (!previousOnline && nowOnline) {
        await flushQueuedRequests(apiClient);
      }
    });
  })();

  try {
    await initializationPromise;
  } catch (error) {
    initialized = false;
    initializationPromise = null;
    throw error;
  }
};

export const shutdownApiClient = () => {
  if (unsubscribeNetInfo) {
    unsubscribeNetInfo();
    unsubscribeNetInfo = null;
  }
  if (responseInterceptorId !== null) {
    apiClient.interceptors.response.eject(responseInterceptorId);
    responseInterceptorId = null;
  }
  if (requestInterceptorId !== null) {
    apiClient.interceptors.request.eject(requestInterceptorId);
    requestInterceptorId = null;
  }
  initialized = false;
  initializationPromise = null;
};

export const flushPendingRequests = async () => {
  if (!getQueueState().isOnline) {
    return;
  }
  await flushQueuedRequests(apiClient);
};

const hasSkipQueueFlag = (config?: InternalAxiosRequestConfig): boolean => {
  if (!config) return false;
  const metadata = (config as InternalAxiosRequestConfig & { metadata?: { skipQueue?: boolean } }).metadata;
  return Boolean(metadata?.skipQueue);
};

const hasRetriedAuthRefresh = (config?: InternalAxiosRequestConfig): boolean => {
  if (!config) return false;
  const metadata = (config as InternalAxiosRequestConfig & { metadata?: { retriedAuthRefresh?: boolean } }).metadata;
  return Boolean(metadata?.retriedAuthRefresh);
};

const setRetryAuthRefresh = (config: InternalAxiosRequestConfig, value: boolean) => {
  const metadata =
    (config as InternalAxiosRequestConfig & { metadata?: { retriedAuthRefresh?: boolean } }).metadata || {};
  metadata.retriedAuthRefresh = value;
  (config as InternalAxiosRequestConfig & { metadata?: { retriedAuthRefresh?: boolean } }).metadata = metadata;
};

const shouldAttemptSessionRefresh = (error: AxiosError, config: InternalAxiosRequestConfig): boolean => {
  if (error.response?.status !== 401) {
    return false;
  }
  if (hasRetriedAuthRefresh(config)) {
    return false;
  }
  const requestUrl = String(config.url || "");
  if (requestUrl.includes("/auth/login") || requestUrl.includes("/auth/register") || requestUrl.includes("/auth/refresh")) {
    return false;
  }
  return true;
};
