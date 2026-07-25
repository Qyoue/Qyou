export interface RegistrationHardeningConfig {
  enableCaptchaOnRegistration: boolean;
  minPasswordScore: number;
  blockDisposableEmails: boolean;
}

export interface LoginThrottleMetrics {
  failedAttemptsInWindow: number;
  remainingCooldownSeconds: number;
  captchaRequired: boolean;
}

export interface PasswordHardeningScore {
  score: number;
  hasEntropy: boolean;
  feedback: string[];
}
