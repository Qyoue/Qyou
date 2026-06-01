import express from "express";
import type { Request, Response } from "express";
import { Horizon } from "@stellar/stellar-sdk";
import { link, unlink, rotate, initiateRecovery, confirmRecovery, checkRewardReadiness } from "./wallet-link.js";
import type {
  WalletLinkInput,
  WalletUnlinkInput,
  WalletRotateInput,
  WalletRecoveryInitInput,
  WalletRecoveryConfirmInput,
} from "@qyou/types";

type ServiceStatus = {
  ok: boolean;
  service: "stellar-service";
  timestamp: string;
};

type StellarServiceInfo = {
  latestLedgerSequence: number | null;
  network: string;
  rpcUrl: string;
};

const port = Number(process.env.PORT ?? 4100);
const network = process.env.STELLAR_NETWORK ?? "testnet";
const rpcUrl = process.env.STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org";
const horizonServer = new Horizon.Server("https://horizon-testnet.stellar.org");

const app = express();
app.use(express.json());

app.get("/health", (_request, response) => {
  const payload: ServiceStatus = {
    ok: true,
    service: "stellar-service",
    timestamp: new Date().toISOString()
  };

  response.json(payload);
});

app.get("/api/v1/stellar/info", async (_request, response) => {
  const latestLedger = await horizonServer.ledgers().order("desc").limit(1).call();
  const payload: StellarServiceInfo = {
    latestLedgerSequence: latestLedger.records[0]?.sequence ?? null,
    network,
    rpcUrl
  };

  response.json(payload);
});

/**
 * POST /api/v1/stellar/wallet/link
 *
 * Body: { accountId, walletAddress }
 * 201  → { ok: true, accountId, walletAddress, linkedAt }
 * 400  → { ok: false, code: "VALIDATION_ERROR" | "ALREADY_LINKED", message }
 * 429  → { ok: false, code: "RATE_LIMITED", message }
 * 500  → { ok: false, code: "INTERNAL_ERROR", message }
 */
app.post("/api/v1/stellar/wallet/link", (request: Request, response: Response) => {
  const input = request.body as WalletLinkInput;
  const result = link(input);

  if (result.ok) {
    response.status(201).json(result);
    return;
  }

  const statusMap: Record<string, number> = {
    VALIDATION_ERROR: 400,
    ALREADY_LINKED: 409,
    NOT_LINKED: 404,
    INVALID_RECOVERY_TOKEN: 401,
    RATE_LIMITED: 429,
    INTERNAL_ERROR: 500,
  };

  response.status(statusMap[result.code] ?? 500).json(result);
});

/**
 * POST /api/v1/stellar/wallet/unlink
 *
 * Body: { accountId }
 * 200  → { ok: true }
 * 400  → { ok: false, code: "VALIDATION_ERROR", message }
 * 404  → { ok: false, code: "NOT_LINKED", message }
 * 500  → { ok: false, code: "INTERNAL_ERROR", message }
 */
app.post("/api/v1/stellar/wallet/unlink", (request: Request, response: Response) => {
  const input = request.body as WalletUnlinkInput;
  const result = unlink(input);

  if (result.ok) {
    response.status(200).json(result);
    return;
  }

  const statusMap: Record<string, number> = {
    VALIDATION_ERROR: 400,
    ALREADY_LINKED: 409,
    NOT_LINKED: 404,
    INVALID_RECOVERY_TOKEN: 401,
    RATE_LIMITED: 429,
    INTERNAL_ERROR: 500,
  };

  response.status(statusMap[result.code] ?? 500).json(result);
});

/**
 * POST /api/v1/stellar/wallet/rotate
 *
 * Body: { accountId, newWalletAddress }
 * 200  → { ok: true, accountId, walletAddress, rotatedAt }
 * 400  → { ok: false, code: "VALIDATION_ERROR", message }
 * 404  → { ok: false, code: "NOT_LINKED", message }
 * 429  → { ok: false, code: "RATE_LIMITED", message }
 * 500  → { ok: false, code: "INTERNAL_ERROR", message }
 */
app.post("/api/v1/stellar/wallet/rotate", (request: Request, response: Response) => {
  const input = request.body as WalletRotateInput;
  const result = rotate(input);

  if (result.ok) {
    response.status(200).json(result);
    return;
  }

  const statusMap: Record<string, number> = {
    VALIDATION_ERROR: 400,
    ALREADY_LINKED: 409,
    NOT_LINKED: 404,
    INVALID_RECOVERY_TOKEN: 401,
    RATE_LIMITED: 429,
    INTERNAL_ERROR: 500,
  };

  response.status(statusMap[result.code] ?? 500).json(result);
});

/**
 * POST /api/v1/stellar/wallet/recovery/initiate
 *
 * Body: { accountId }
 * 200  → { ok: true, recoveryToken, expiresAt }
 * 400  → { ok: false, code: "VALIDATION_ERROR", message }
 * 429  → { ok: false, code: "RATE_LIMITED", message }
 * 500  → { ok: false, code: "INTERNAL_ERROR", message }
 */
app.post("/api/v1/stellar/wallet/recovery/initiate", (request: Request, response: Response) => {
  const input = request.body as WalletRecoveryInitInput;
  const result = initiateRecovery(input);

  if (result.ok) {
    response.status(200).json(result);
    return;
  }

  const statusMap: Record<string, number> = {
    VALIDATION_ERROR: 400,
    ALREADY_LINKED: 409,
    NOT_LINKED: 404,
    INVALID_RECOVERY_TOKEN: 401,
    RATE_LIMITED: 429,
    INTERNAL_ERROR: 500,
  };

  response.status(statusMap[result.code] ?? 500).json(result);
});

/**
 * POST /api/v1/stellar/wallet/recovery/confirm
 *
 * Body: { accountId, recoveryToken, newWalletAddress }
 * 200  → { ok: true, accountId, walletAddress }
 * 400  → { ok: false, code: "VALIDATION_ERROR", message }
 * 401  → { ok: false, code: "INVALID_RECOVERY_TOKEN", message }
 * 500  → { ok: false, code: "INTERNAL_ERROR", message }
 */
app.post("/api/v1/stellar/wallet/recovery/confirm", (request: Request, response: Response) => {
  const input = request.body as WalletRecoveryConfirmInput;
  const result = confirmRecovery(input);

  if (result.ok) {
    response.status(200).json(result);
    return;
  }

  const statusMap: Record<string, number> = {
    VALIDATION_ERROR: 400,
    ALREADY_LINKED: 409,
    NOT_LINKED: 404,
    INVALID_RECOVERY_TOKEN: 401,
    RATE_LIMITED: 429,
    INTERNAL_ERROR: 500,
  };

  response.status(statusMap[result.code] ?? 500).json(result);
});

/**
 * GET /api/v1/stellar/wallet/readiness?accountId={accountId}
 *
 * AUTH-097: Check whether an account is ready to receive Stellar-backed rewards.
 *
 * 200  → { ready: true,  accountId, walletAddress }
 *      → { ready: false, accountId, reason: "NO_WALLET_LINKED" | "INVALID_ADDRESS" | "RECOVERY_IN_PROGRESS" }
 * 400  → { error: "accountId is required" }
 * 500  → { error: "Internal error" }
 */
app.get("/api/v1/stellar/wallet/readiness", (request: Request, response: Response) => {
  const accountId = (request.query["accountId"] as string | undefined)?.trim();

  if (!accountId) {
    response.status(400).json({ error: "accountId is required" });
    return;
  }

  try {
    const result = checkRewardReadiness(accountId);
    response.status(200).json(result);
  } catch {
    response.status(500).json({ error: "Internal error" });
  }
});

app.listen(port, () => {
  console.log(`[stellar-service] listening on http://localhost:${port}`);
});
