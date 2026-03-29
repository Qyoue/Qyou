import axios from "axios";
import { clearStoredSessionTokens, saveSessionTokens } from "./secureTokens";
import { useSessionStore } from "./sessionStore";

const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL;
if (!apiBaseUrl) {
  throw new Error("EXPO_PUBLIC_API_URL is required");
}

const client = axios.create({
  baseURL: apiBaseUrl,
  timeout: 10000,
});

type AuthResponsePayload = {
  data?: {
    accessToken?: string;
    refreshToken?: string;
    deviceId?: string;
  };
};

export const registerWithEmail = async (email: string, password: string) => {
  await client.post("/auth/register", { email, password });
};

export const loginWithEmail = async (params: {
  email: string;
  password: string;
  deviceId?: string;
}) => {
  const response = await client.post("/auth/login", {
    email: params.email,
    password: params.password,
    deviceId: params.deviceId,
  });

  const payload = response.data as AuthResponsePayload;
  const accessToken = payload.data?.accessToken;
  const refreshToken = payload.data?.refreshToken;
  const deviceId = payload.data?.deviceId || params.deviceId;

  if (!accessToken || !refreshToken) {
    throw new Error("Malformed login response");
  }

  await saveSessionTokens({
    accessToken,
    refreshToken,
    deviceId,
  });

  useSessionStore.getState().setStateSnapshot({
    status: "authenticated",
    message: "Session ready.",
    deviceId: deviceId ?? null,
  });
};

export const logoutSession = async () => {
  await clearStoredSessionTokens();
  useSessionStore.getState().setStateSnapshot({
    status: "unauthenticated",
    message: "Signed out.",
    deviceId: null,
  });
};

