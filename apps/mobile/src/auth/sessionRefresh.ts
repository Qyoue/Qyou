import axios from "axios";
import { clearStoredSessionTokens, getStoredSessionTokens, saveSessionTokens } from "./secureTokens";
import { useSessionStore } from "./sessionStore";
import type { AuthSessionResponse } from "@/src/network/contracts";

const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL;
if (!apiBaseUrl) {
  throw new Error("EXPO_PUBLIC_API_URL is required");
}

const refreshClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
});

export type RefreshSessionResult =
  | {
      success: true;
      accessToken: string;
      refreshToken: string;
      deviceId?: string;
    }
  | {
      success: false;
      reason: "MISSING_REFRESH_TOKEN" | "INVALID_REFRESH_RESPONSE" | "REFRESH_FAILED";
    };

let refreshInFlight: Promise<RefreshSessionResult> | null = null;

const finalizeExpiredSession = async (message: string) => {
  await clearStoredSessionTokens();
  useSessionStore.getState().setStateSnapshot({
    status: "unauthenticated",
    message,
    deviceId: null,
  });
};

const performRefresh = async (): Promise<RefreshSessionResult> => {
  const stored = await getStoredSessionTokens();
  if (!stored.refreshToken) {
    return {
      success: false,
      reason: "MISSING_REFRESH_TOKEN",
    };
  }

  try {
    const response = await refreshClient.post(
      "/auth/refresh",
      {
        refreshToken: stored.refreshToken,
      },
      {
        headers: stored.deviceId ? { "x-device-id": stored.deviceId } : undefined,
      }
    );
    const data = (response.data as AuthSessionResponse).data;
    if (!data?.accessToken || !data?.refreshToken) {
      await finalizeExpiredSession("Session expired. Please sign in again.");
      return {
        success: false,
        reason: "INVALID_REFRESH_RESPONSE",
      };
    }

    await saveSessionTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      deviceId: data.deviceId || stored.deviceId || undefined,
    });

    useSessionStore.getState().setStateSnapshot({
      status: "authenticated",
      message: "Session ready.",
      deviceId: data.deviceId || stored.deviceId || null,
    });

    return {
      success: true,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      deviceId: data.deviceId || stored.deviceId || undefined,
    };
  } catch {
    await finalizeExpiredSession("Session expired. Please sign in again.");
    return {
      success: false,
      reason: "REFRESH_FAILED",
    };
  }
};

export const refreshSessionTokens = async (): Promise<RefreshSessionResult> => {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }

  return refreshInFlight;
};

export const clearExpiredSession = async () => {
  await finalizeExpiredSession("Session expired. Please sign in again.");
};
