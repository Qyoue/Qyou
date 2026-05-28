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
