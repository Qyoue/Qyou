import cors from "cors";
import express from "express";
import type { Request, Response } from "express";
import { register } from "./auth/registration.js";
import { login } from "./auth/login.js";
import { refresh, logout } from "./auth/session.js";
import { requestReset, confirmReset } from "./auth/password-reset.js";
import type {
  LoginInput,
  LogoutInput,
  PasswordResetConfirmInput,
  PasswordResetRequestInput,
  RefreshInput,
  RegistrationInput,
} from "@qyou/types";

type ServiceStatus = {
  ok: boolean;
  service: "api";
  timestamp: string;
};

type AuthBootstrap = {
  nextStep: string;
  providers: Array<"email-password" | "stellar-wallet-link">;
  sessionStrategy: "jwt";
};

const port = Number(process.env.PORT ?? 4000);
const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:3000";

const app = express();

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get("/health", (_request, response) => {
  const payload: ServiceStatus = {
    ok: true,
    service: "api",
    timestamp: new Date().toISOString()
  };

  response.json(payload);
});

app.get("/api/v1/auth/bootstrap", (_request, response) => {
  const payload: AuthBootstrap = {
    providers: ["email-password", "stellar-wallet-link"],
    sessionStrategy: "jwt",
    nextStep: "Implement registration, login, refresh, logout, and wallet-linking flows."
  };

  response.json(payload);
});

/**
 * POST /api/v1/auth/register
 *
 * Body: { email, password, displayName? }
 * 201  → { ok: true, accountId, email, status }
 * 400  → { ok: false, code: "VALIDATION_ERROR", message }
 * 409  → { ok: false, code: "DUPLICATE_EMAIL", message }
 * 429  → { ok: false, code: "RATE_LIMITED", message }
 * 500  → { ok: false, code: "INTERNAL_ERROR", message }
 */
app.post("/api/v1/auth/register", (request: Request, response: Response) => {
  const ip =
    (request.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
    request.socket.remoteAddress ??
    "unknown";

  const input = request.body as RegistrationInput;
  const result = register(input, ip);

  if (result.ok) {
    response.status(201).json(result);
    return;
  }

  const statusMap: Record<string, number> = {
    VALIDATION_ERROR: 400,
    DUPLICATE_EMAIL: 409,
    RATE_LIMITED: 429,
    INTERNAL_ERROR: 500,
  };

  response.status(statusMap[result.code] ?? 500).json(result);
});

/**
 * POST /api/v1/auth/login
 *
 * Body: { email, password }
 * 200  → { ok: true, accountId, email, tokens: { accessToken, expiresAt, refreshToken } }
 * 400  → { ok: false, code: "VALIDATION_ERROR", message }
 * 401  → { ok: false, code: "INVALID_CREDENTIALS", message }
 * 429  → { ok: false, code: "RATE_LIMITED", message }
 * 500  → { ok: false, code: "INTERNAL_ERROR", message }
 */
app.post("/api/v1/auth/login", (request: Request, response: Response) => {
  const ip =
    (request.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
    request.socket.remoteAddress ??
    "unknown";

  const input = request.body as LoginInput;
  const result = login(input, ip);

  if (result.ok) {
    response.status(200).json(result);
    return;
  }

  const statusMap: Record<string, number> = {
    VALIDATION_ERROR: 400,
    INVALID_CREDENTIALS: 401,
    RATE_LIMITED: 429,
    INTERNAL_ERROR: 500,
  };

  response.status(statusMap[result.code] ?? 500).json(result);
});

/**
 * POST /api/v1/auth/refresh
 *
 * Body: { refreshToken }
 * 200  → { ok: true, tokens: { accessToken, expiresAt, refreshToken } }
 * 400  → { ok: false, code: "VALIDATION_ERROR", message }
 * 401  → { ok: false, code: "INVALID_REFRESH_TOKEN", message }
 * 500  → { ok: false, code: "INTERNAL_ERROR", message }
 */
app.post("/api/v1/auth/refresh", (request: Request, response: Response) => {
  const input = request.body as RefreshInput;
  const result = refresh(input);

  if (result.ok) {
    response.status(200).json(result);
    return;
  }

  const statusMap: Record<string, number> = {
    VALIDATION_ERROR: 400,
    INVALID_REFRESH_TOKEN: 401,
    INTERNAL_ERROR: 500,
  };

  response.status(statusMap[result.code] ?? 500).json(result);
});

/**
 * POST /api/v1/auth/logout
 *
 * Body: { refreshToken }
 * 200  → { ok: true }
 * 400  → { ok: false, code: "VALIDATION_ERROR", message }
 * 500  → { ok: false, code: "INTERNAL_ERROR", message }
 */
app.post("/api/v1/auth/logout", (request: Request, response: Response) => {
  const input = request.body as LogoutInput;
  const result = logout(input);

  if (result.ok) {
    response.status(200).json(result);
    return;
  }

  const statusMap: Record<string, number> = {
    VALIDATION_ERROR: 400,
    INTERNAL_ERROR: 500,
  };

  response.status(statusMap[result.code] ?? 500).json(result);
});

/**
 * POST /api/v1/auth/password-reset/request
 *
 * Body: { email }
 * 200  → { ok: true }
 * 400  → { ok: false, code: "VALIDATION_ERROR", message }
 * 500  → { ok: false, code: "INTERNAL_ERROR", message }
 */
app.post("/api/v1/auth/password-reset/request", (request: Request, response: Response) => {
  const ip =
    (request.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
    request.socket.remoteAddress ??
    "unknown";

  const input = request.body as PasswordResetRequestInput;
  const result = requestReset(input, ip);

  if (result.ok) {
    response.status(200).json(result);
    return;
  }

  const statusMap: Record<string, number> = {
    VALIDATION_ERROR: 400,
    INTERNAL_ERROR: 500,
  };

  response.status(statusMap[result.code] ?? 500).json(result);
});

/**
 * POST /api/v1/auth/password-reset/confirm
 *
 * Body: { token, newPassword }
 * 200  → { ok: true }
 * 400  → { ok: false, code: "VALIDATION_ERROR", message }
 * 401  → { ok: false, code: "INVALID_RESET_TOKEN", message }
 * 500  → { ok: false, code: "INTERNAL_ERROR", message }
 */
app.post("/api/v1/auth/password-reset/confirm", (request: Request, response: Response) => {
  const input = request.body as PasswordResetConfirmInput;
  const result = confirmReset(input);

  if (result.ok) {
    response.status(200).json(result);
    return;
  }

  const statusMap: Record<string, number> = {
    VALIDATION_ERROR: 400,
    INVALID_RESET_TOKEN: 401,
    INTERNAL_ERROR: 500,
  };

  response.status(statusMap[result.code] ?? 500).json(result);
});

app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
});
