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

// --- Stellar Wallet Link (AUTH-092 / AUTH-093) ---

export type WalletLinkRecord = {
  accountId: string;
  walletAddress: string;
  linkedAt: string;       // ISO-8601
  rotatedAt?: string;     // ISO-8601, set on each rotation
  recoveryToken?: string; // opaque UUID, set when recovery is initiated
  recoveryExpiresAt?: number; // Unix ms
};

export type WalletLinkInput = {
  accountId: string;
  walletAddress: string;
};

export type WalletUnlinkInput = {
  accountId: string;
};

export type WalletRotateInput = {
  accountId: string;
  newWalletAddress: string;
};

export type WalletRecoveryInitInput = {
  accountId: string;
};

export type WalletRecoveryConfirmInput = {
  accountId: string;
  recoveryToken: string;
  newWalletAddress: string;
};

export type WalletLinkResult =
  | { ok: true; accountId: string; walletAddress: string; linkedAt: string }
  | { ok: false; code: WalletLinkErrorCode; message: string };

export type WalletUnlinkResult =
  | { ok: true }
  | { ok: false; code: WalletLinkErrorCode; message: string };

export type WalletRotateResult =
  | { ok: true; accountId: string; walletAddress: string; rotatedAt: string }
  | { ok: false; code: WalletLinkErrorCode; message: string };

export type WalletRecoveryInitResult =
  | { ok: true; recoveryToken: string; expiresAt: string }
  | { ok: false; code: WalletLinkErrorCode; message: string };

export type WalletRecoveryConfirmResult =
  | { ok: true; accountId: string; walletAddress: string }
  | { ok: false; code: WalletLinkErrorCode; message: string };

export type WalletLinkErrorCode =
  | "VALIDATION_ERROR"
  | "ALREADY_LINKED"
  | "NOT_LINKED"
  | "INVALID_RECOVERY_TOKEN"
  | "RATE_LIMITED"
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
