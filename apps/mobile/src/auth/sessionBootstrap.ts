import { requestBiometricUnlock } from "./biometricGate";
import { getStoredSessionTokens } from "./secureTokens";
import { refreshSessionTokens } from "./sessionRefresh";

type BootstrapState = "loading" | "authenticated" | "unauthenticated" | "locked";

export type SessionBootstrapResult = {
  state: BootstrapState;
  message: string;
  deviceId?: string;
};

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
    const refreshed = await refreshSessionTokens();
    if (!refreshed.success) {
      return {
        state: "unauthenticated",
        message: "Session expired. Please sign in again.",
        deviceId: undefined,
      };
    }

    return {
      state: "authenticated",
      message: "Session unlocked and refreshed.",
      deviceId: refreshed.deviceId || stored.deviceId || undefined,
    };
  } catch {
    return {
      state: "unauthenticated",
      message: "Session expired. Please sign in again.",
      deviceId: undefined,
    };
  }
};
