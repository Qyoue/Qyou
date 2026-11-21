export interface DeviceFingerprintPayload {
  deviceId: string;
  userAgent: string;
  ipAddress?: string;
  isKnownDevice: boolean;
}

export interface LoginSecurityMetrics {
  riskScore: number;
  requireTwoFactor: boolean;
  blockReason?: string;
}

export interface SecurityPolicyRules {
  allowUnrecognizedDevices: boolean;
  maxFailedLoginsPerIp: number;
  windowMinutes: number;
}
