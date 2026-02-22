import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import NetInfo from "@react-native-community/netinfo";
import { enqueueRequest, flushQueuedRequests, getPendingQueueCount } from "./offlineQueue";
import { getQueueState, setQueueState } from "./queueState";
import { QueuedRequest, isQueueableMethod } from "./types";

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

export const initializeApiClient = async () => {
  if (initialized) {
    return;
  }
  initialized = true;

  const pendingCount = await getPendingQueueCount();
  setQueueState({ pendingCount });

  const current = await NetInfo.fetch();
  const initialOnline = Boolean(current.isConnected && current.isInternetReachable !== false);
  setQueueState({ isOnline: initialOnline });

  if (initialOnline) {
    await flushQueuedRequests(apiClient);
  }

  responseInterceptorId = apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const config = error.config;
      if (!config) {
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
  initialized = false;
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
