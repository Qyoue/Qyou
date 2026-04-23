import axios from "axios";
import { requestBiometricUnlock } from "./biometricGate";
import {
  clearStoredSessionTokens,
  getStoredSessionTokens,
  saveSessionTokens,
} from "./secureTokens";
import type { AuthSessionResponse } from "@/src/network/contracts";

type BootstrapState = "loading" | "authenticated" | "unauthenticated" | "locked";

export type SessionBootstrapResult = {
  state: BootstrapState;
  message: string;
  deviceId?: string;
};

const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL;
if (!apiBaseUrl) {
  throw new Error("EXPO_PUBLIC_API_URL is required");
}

const client = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
});

export const bootstrapSession = async (): Promise<SessionBootstrapResult> => {
  const stored = await getStoredSessionTokens();

  if (!stored.refreshToken) {
    return {
      state: "unauthenticated",
      message: "No previous session found.",
      deviceId: stored.deviceId || undefined,
    };
  }

  const biometric = await requestBiometricUnlock();
  if (!biometric.success) {
    return {
      state: "locked",
      message: biometric.reason || "Biometric unlock failed.",
      deviceId: stored.deviceId || undefined,
    };
  }

  try {
    const response = await client.post("/auth/refresh", {
      refreshToken: stored.refreshToken,
    });

    const data = (response.data as AuthSessionResponse).data;

    if (!data?.accessToken || !data?.refreshToken) {
      throw new Error("Malformed refresh response");
    }

    await saveSessionTokens({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      deviceId: data.deviceId || stored.deviceId || undefined,
    });

    return {
      state: "authenticated",
      message: "Session unlocked and refreshed.",
      deviceId: data.deviceId || stored.deviceId || undefined,
    };
  } catch {
    await clearStoredSessionTokens();
    return {
      state: "unauthenticated",
      message: "Session expired. Please sign in again.",
      deviceId: undefined,
    };
  }
};
