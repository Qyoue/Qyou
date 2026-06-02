import express from "express";
import type { Request, Response } from "express";
import { Horizon } from "@stellar/stellar-sdk";
import type { RewardAccountReadinessResult } from "@qyou/types";
import { getAuthBaselineReport, loadNodeServiceConfig, loadStellarAuthConfig } from "@qyou/config";
import { link, unlink, rotate, initiateRecovery, confirmRecovery, checkRewardReadiness } from "./wallet-link.js";
import { issueChallenge, verifyChallenge } from "./challenge-verify.js";
import type {
  WalletLinkInput,
  WalletUnlinkInput,
  WalletRotateInput,
  WalletRecoveryInitInput,
  WalletRecoveryConfirmInput,
  ChallengeIssueInput,
  ChallengeVerifyInput,
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

const serviceConfig = loadNodeServiceConfig({ defaultPort: 4100, serviceName: "stellar-service" });
const stellarConfig = loadStellarAuthConfig();

// AUTH-102/103/104: baseline check for shared auth config across workspaces.
const baseline = getAuthBaselineReport();
for (const warning of baseline.warnings) {
  console.warn(JSON.stringify({ level: "warn", event: "auth.baseline.warning", warning, ts: new Date().toISOString() }));
}
if (!baseline.ok) {
  for (const error of baseline.errors) {
    console.error(JSON.stringify({ level: "error", event: "auth.baseline.error", error, ts: new Date().toISOString() }));
  }
  throw new Error("Shared auth baseline validation failed.");
}

const horizonServer = new Horizon.Server(stellarConfig.horizonUrl);

const app = express();
app.use(express.json());

// --- Logging helpers (AUTH-099) ---

function logInfo(event: string, data?: Record<string, unknown>): void {
  console.log(JSON.stringify({ level: "info", event, ...data, ts: new Date().toISOString() }));
}

function logWarn(event: string, data?: Record<string, unknown>): void {
  console.warn(JSON.stringify({ level: "warn", event, ...data, ts: new Date().toISOString() }));
}

function logError(event: string, data?: Record<string, unknown>): void {
  console.error(JSON.stringify({ level: "error", event, ...data, ts: new Date().toISOString() }));
}

// --- Validation helpers (AUTH-098) ---

const STELLAR_ADDRESS_RE = /^G[A-Z2-7]{55}$/;

function isValidStellarAddress(address: string): boolean {
  return STELLAR_ADDRESS_RE.test(address);
}

// --- Health ---

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "stellar-service", timestamp: new Date().toISOString() });
});

// --- Stellar info ---

app.get("/api/v1/stellar/info", async (_req, res) => {
  try {
    const latestLedger = await horizonServer.ledgers().order("desc").limit(1).call();
    res.json({
      latestLedgerSequence: latestLedger.records[0]?.sequence ?? null,
      network: stellarConfig.network,
      rpcUrl: stellarConfig.rpcUrl
    });
  } catch (err) {
    logError("stellar.info.failed", { error: String(err) });
    res.status(503).json({ ok: false, code: "STELLAR_UNREACHABLE", message: "Horizon unavailable." });
  }
});

// --- AUTH-098 + AUTH-099: Reward-account readiness (hardened + instrumented) ---

/**
 * GET /api/v1/stellar/reward-account/readiness?address=G...
 *
 * Checks whether a Stellar address is funded and ready to receive rewards.
 * - Validates the address format (AUTH-098: input guardrail)
 * - Queries Horizon for account existence and funding (AUTH-098: resilience)
 * - Emits structured audit log events at each checkpoint (AUTH-099)
 * - Returns a typed RewardAccountReadinessResult (AUTH-098: consistent contract)
 */
app.get("/api/v1/stellar/reward-account/readiness", async (req, res) => {
  const { address } = req.query;

  // AUTH-099: log incoming request
  logInfo("reward_account.readiness.requested", { address: typeof address === "string" ? address : undefined });

  // AUTH-098: validate input
  if (typeof address !== "string" || address.trim() === "") {
    logWarn("reward_account.readiness.validation_failed", { reason: "missing_address" });
    const result: RewardAccountReadinessResult = {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Query parameter 'address' is required."
    };
    res.status(400).json(result);
    return;
  }

  const trimmed = address.trim();

  if (!isValidStellarAddress(trimmed)) {
    logWarn("reward_account.readiness.validation_failed", { reason: "invalid_address_format", address: trimmed });
    const result: RewardAccountReadinessResult = {
      ok: false,
      code: "VALIDATION_ERROR",
      message: "Invalid Stellar address format."
    };
    res.status(400).json(result);
    return;
  }

  // AUTH-098: query Horizon with fallback handling
  try {
    const account = await horizonServer.loadAccount(trimmed);

    // AUTH-098: check minimum balance (funded = at least 1 XLM base reserve)
    const nativeBalance = account.balances.find(
      (b): b is Horizon.HorizonApi.BalanceLineNative => b.asset_type === "native"
    );
    const balanceXlm = nativeBalance ? parseFloat(nativeBalance.balance) : 0;

    if (balanceXlm < 1) {
      // AUTH-099: audit signal for underfunded account
      logWarn("reward_account.readiness.not_funded", { address: trimmed, balanceXlm });
      const result: RewardAccountReadinessResult = {
        ok: false,
        code: "ACCOUNT_NOT_FUNDED",
        message: "Stellar account exists but has insufficient balance to receive rewards."
      };
      res.status(422).json(result);
      return;
    }

    // AUTH-099: audit signal for successful readiness check
    logInfo("reward_account.readiness.ok", { address: trimmed, balanceXlm });

    const result: RewardAccountReadinessResult = {
      ok: true,
      accountId: account.id,
      stellarAddress: trimmed,
      status: "active"
    };
    res.json(result);
  } catch (err: unknown) {
    // AUTH-098: distinguish "not found" from network errors
    const isNotFound =
      typeof err === "object" &&
      err !== null &&
      "response" in err &&
      (err as { response?: { status?: number } }).response?.status === 404;

    if (isNotFound) {
      logWarn("reward_account.readiness.not_found", { address: trimmed });
      const result: RewardAccountReadinessResult = {
        ok: false,
        code: "ACCOUNT_NOT_FOUND",
        message: "Stellar account not found. The address may not be activated yet."
      };
      res.status(404).json(result);
      return;
    }

    // AUTH-099: log unexpected errors
    logError("reward_account.readiness.error", { address: trimmed, error: String(err) });
    const result: RewardAccountReadinessResult = {
      ok: false,
      code: "STELLAR_UNREACHABLE",
      message: "Could not reach Stellar network. Please retry."
    };
    res.status(503).json(result);
  }
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

/**
 * POST /api/v1/stellar/challenge/issue
 *
 * AUTH-082: Issue a signed challenge nonce for a Stellar wallet address.
 * Body: { walletAddress }
 * 200  → { ok: true, challengeId, nonce, expiresAt }
 * 400  → { ok: false, code: "VALIDATION_ERROR", message }
 * 429  → { ok: false, code: "RATE_LIMITED", message }
 */
app.post("/api/v1/stellar/challenge/issue", (request: Request, response: Response) => {
  const input = request.body as ChallengeIssueInput;
  const result = issueChallenge(input);
  if (result.ok) {
    response.status(200).json(result);
    return;
  }
  const statusMap: Record<string, number> = { VALIDATION_ERROR: 400, RATE_LIMITED: 429, INTERNAL_ERROR: 500 };
  response.status(statusMap[result.code] ?? 500).json(result);
});

/**
 * POST /api/v1/stellar/challenge/verify
 *
 * AUTH-082: Verify an Ed25519 signature over a previously issued challenge nonce.
 * Body: { challengeId, walletAddress, signature }
 * 200  → { ok: true, walletAddress, verifiedAt }
 * 400  → VALIDATION_ERROR | ADDRESS_MISMATCH
 * 401  → INVALID_SIGNATURE
 * 404  → CHALLENGE_NOT_FOUND
 * 409  → CHALLENGE_ALREADY_USED
 * 410  → CHALLENGE_EXPIRED
 * 429  → RATE_LIMITED
 */
app.post("/api/v1/stellar/challenge/verify", (request: Request, response: Response) => {
  const input = request.body as ChallengeVerifyInput;
  const result = verifyChallenge(input);
  if (result.ok) {
    response.status(200).json(result);
    return;
  }
  const statusMap: Record<string, number> = {
    VALIDATION_ERROR: 400,
    ADDRESS_MISMATCH: 400,
    INVALID_SIGNATURE: 401,
    CHALLENGE_NOT_FOUND: 404,
    CHALLENGE_ALREADY_USED: 409,
    CHALLENGE_EXPIRED: 410,
    RATE_LIMITED: 429,
    INTERNAL_ERROR: 500,
  };
  response.status(statusMap[result.code] ?? 500).json(result);
});

app.listen(serviceConfig.port, () => {
  logInfo("stellar_service.started", {
    port: serviceConfig.port,
    network: stellarConfig.network,
    horizonUrl: stellarConfig.horizonUrl,
    rpcUrl: stellarConfig.rpcUrl
  });
});
