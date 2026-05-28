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
