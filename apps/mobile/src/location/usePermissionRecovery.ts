/**
 * usePermissionRecovery – provides recovery actions when foreground location
 * permission has been permanently denied.
 * Issue #174
 */

import { useCallback, useState } from "react";
import { Linking, Platform } from "react-native";

export type RecoveryState = "idle" | "opening-settings" | "opened" | "error";

export interface PermissionRecovery {
  recoveryState: RecoveryState;
  canOpenSettings: boolean;
  openAppSettings: () => Promise<void>;
  reset: () => void;
}

const SETTINGS_URL = Platform.select({
  ios: "app-settings:",
  android: "package:com.qyou.app",
  default: "",
});

export const usePermissionRecovery = (): PermissionRecovery => {
  const [recoveryState, setRecoveryState] = useState<RecoveryState>("idle");

  const canOpenSettings = Boolean(SETTINGS_URL);

  const openAppSettings = useCallback(async () => {
    if (!SETTINGS_URL) {
      setRecoveryState("error");
      return;
    }

    setRecoveryState("opening-settings");

    try {
      const supported = await Linking.canOpenURL(SETTINGS_URL);
      if (!supported) {
        setRecoveryState("error");
        return;
      }
      await Linking.openURL(SETTINGS_URL);
      setRecoveryState("opened");
    } catch {
      setRecoveryState("error");
    }
  }, []);

  const reset = useCallback(() => setRecoveryState("idle"), []);

  return { recoveryState, canOpenSettings, openAppSettings, reset };
};
