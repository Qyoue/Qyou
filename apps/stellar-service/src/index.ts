import express from "express";
import { Horizon } from "@stellar/stellar-sdk";
import type { RewardAccountReadinessResult } from "@qyou/types";

const port = Number(process.env.PORT ?? 4100);
const network = process.env.STELLAR_NETWORK ?? "testnet";
const rpcUrl = process.env.STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org";
const horizonUrl = process.env.STELLAR_HORIZON_URL ?? "https://horizon-testnet.stellar.org";
const horizonServer = new Horizon.Server(horizonUrl);

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
      network,
      rpcUrl
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

app.listen(port, () => {
  logInfo("stellar_service.started", { port, network, horizonUrl, rpcUrl });
});
