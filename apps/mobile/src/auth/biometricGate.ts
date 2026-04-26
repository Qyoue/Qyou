import * as LocalAuthentication from "expo-local-authentication";

export type BiometricGateResult = {
  success: boolean;
  reason?: string;
};

export const requestBiometricUnlock = async (): Promise<BiometricGateResult> => {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) {
    return {
      success: false,
      reason: "Biometric hardware unavailable on this device.",
    };
  }

  const enrolled = await LocalAuthentication.isEnrolledAsync();
  if (!enrolled) {
    return {
      success: false,
      reason: "No biometric profile is enrolled on this device.",
    };
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Unlock Qyou Session",
    cancelLabel: "Cancel",
    disableDeviceFallback: false,
  });

  if (!result.success) {
    return {
      success: false,
      reason: result.error || "Biometric authentication failed.",
    };
  }

  return { success: true };
};
