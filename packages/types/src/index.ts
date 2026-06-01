export type ServiceStatus = {
  ok: boolean;
  service: "api" | "stellar-service";
  timestamp: string;
};

export type AuthBootstrap = {
  nextStep: string;
  providers: Array<"email-password" | "stellar-wallet-link">;
  sessionStrategy: "jwt";
};

export type StellarServiceInfo = {
  latestLedgerSequence: number | null;
  network: string;
  rpcUrl: string;
};

// --- Account Registration ---

export type RegistrationInput = {
  email: string;
  password: string;
  displayName?: string;
};

export type AccountRecord = {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  createdAt: string;
  status: "pending_verification" | "active";
};

export type RegistrationResult =
  | { ok: true; accountId: string; email: string; status: AccountRecord["status"] }
  | { ok: false; code: RegistrationErrorCode; message: string };

export type RegistrationErrorCode =
  | "VALIDATION_ERROR"
  | "DUPLICATE_EMAIL"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

// --- Login / Token Issuance ---

export type LoginInput = {
  email: string;
  password: string;
};

export type TokenPair = {
  accessToken: string;
  /** ISO-8601 expiry of the access token */
  expiresAt: string;
  refreshToken: string;
};

export type LoginResult =
  | { ok: true; accountId: string; email: string; tokens: TokenPair }
  | { ok: false; code: LoginErrorCode; message: string };

export type LoginErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_CREDENTIALS"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

// --- Session: Refresh & Logout ---

export type RefreshInput = {
  refreshToken: string;
};

export type RefreshResult =
  | { ok: true; tokens: TokenPair }
  | { ok: false; code: SessionErrorCode; message: string };

export type LogoutInput = {
  refreshToken: string;
};

export type LogoutResult =
  | { ok: true }
  | { ok: false; code: SessionErrorCode; message: string };

export type SessionErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_REFRESH_TOKEN"
  | "INTERNAL_ERROR";

// --- Email Verification (AUTH-021) ---

export type VerificationInput = {
  token: string;
};

export type VerificationResult =
  | { ok: true; accountId: string; email: string }
  | { ok: false; code: VerificationErrorCode; message: string };

export type VerificationErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_VERIFICATION_TOKEN"
  | "ALREADY_VERIFIED"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

// --- Reward Account Readiness (AUTH-098/099/100) ---

export type RewardAccountStatus =
  | "not_linked"
  | "pending_activation"
  | "active"
  | "suspended";

export type RewardAccountReadinessResult =
  | { ok: true; accountId: string; stellarAddress: string; status: RewardAccountStatus }
  | { ok: false; code: RewardAccountErrorCode; message: string };

export type RewardAccountErrorCode =
  | "VALIDATION_ERROR"
  | "ACCOUNT_NOT_FOUND"
  | "STELLAR_UNREACHABLE"
  | "ACCOUNT_NOT_FUNDED"
  | "INTERNAL_ERROR";

// --- Password Reset (AUTH-016) ---

export type PasswordResetRequestInput = {
  email: string;
};

export type PasswordResetRequestResult =
  | { ok: true }
  | { ok: false; code: PasswordResetErrorCode; message: string };

export type PasswordResetConfirmInput = {
  token: string;
  newPassword: string;
};

export type PasswordResetConfirmResult =
  | { ok: true }
  | { ok: false; code: PasswordResetErrorCode; message: string };

export type PasswordResetErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_RESET_TOKEN"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";
