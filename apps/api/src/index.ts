import cors from "cors";
import express from "express";
import type { Request, Response } from "express";
import { register } from "./auth/registration.js";
import type { RegistrationInput } from "@qyou/types";

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

app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
});
