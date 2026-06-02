import { config as loadDotenv } from "dotenv";

loadDotenv();

export { createStructuredLogger } from "./logger.js";
export type { LogLevel, StructuredLogEntry, StructuredLoggerOptions } from "./logger.js";
export { checkAbuse, resetAbuseBuckets } from "./abuse.js";

function parseNumberEnv(
  name: string,
  fallback: number,
  options?: { integer?: boolean; min?: number }
): { value: number; usedFallback: boolean } {
  const raw = process.env[name];
  if (raw === undefined || raw === "") {
    return { value: fallback, usedFallback: true };
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${name} value.`);
  }

  if (options?.integer && !Number.isInteger(parsed)) {
    throw new Error(`${name} must be an integer.`);
  }

  if (options?.min !== undefined && parsed < options.min) {
    throw new Error(`${name} must be >= ${options.min}.`);
  }

  return { value: parsed, usedFallback: false };
}

type NodeServiceConfigOptions = {
  defaultPort: number;
  serviceName: string;
};

export type NodeServiceConfig = {
  corsOrigin: string;
  nodeEnv: string;
  port: number;
  serviceName: string;
};

export function loadNodeServiceConfig(options: NodeServiceConfigOptions): NodeServiceConfig {
  const portValue = Number(process.env.PORT ?? options.defaultPort);

  if (Number.isNaN(portValue)) {
    throw new Error(`Invalid PORT value for ${options.serviceName}.`);
  }

  return {
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    nodeEnv: process.env.NODE_ENV ?? "development",
    port: portValue,
    serviceName: options.serviceName
  };
}

// --- AUTH-101: Shared auth config baseline ---

export type AuthConfig = {
  /** JWT secret used to sign access tokens. Must be set in production. */
  jwtSecret: string;
  /** Access token TTL in seconds (default: 900 = 15 min). */
  accessTokenTtlSeconds: number;
  /** Refresh token TTL in seconds (default: 604800 = 7 days). */
  refreshTokenTtlSeconds: number;
  /** CORS origin allowed for auth endpoints. */
  corsOrigin: string;
};

export type StellarAuthConfig = {
  /** Stellar network: "testnet" | "mainnet" */
  network: "testnet" | "mainnet";
  /** Horizon server URL */
  horizonUrl: string;
  /** Soroban RPC URL */
  rpcUrl: string;
};

/**
 * Load the shared auth config from environment variables.
 * Throws if required production values are missing.
 */
export function loadAuthConfig(): AuthConfig {
  const jwtSecret = process.env.JWT_SECRET;
  const nodeEnv = process.env.NODE_ENV ?? "development";

  if (nodeEnv === "production" && !jwtSecret) {
    throw new Error("JWT_SECRET must be set in production.");
  }

  const accessTtl = parseNumberEnv("ACCESS_TOKEN_TTL_SECONDS", 900, { integer: true, min: 1 });
  const refreshTtl = parseNumberEnv("REFRESH_TOKEN_TTL_SECONDS", 604800, { integer: true, min: 1 });

  return {
    jwtSecret: jwtSecret ?? "dev-secret-change-in-production",
    accessTokenTtlSeconds: accessTtl.value,
    refreshTokenTtlSeconds: refreshTtl.value,
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000"
  };
}

/**
 * Load Stellar-specific auth config from environment variables.
 */
export function loadStellarAuthConfig(): StellarAuthConfig {
  const rawNetwork = process.env.STELLAR_NETWORK ?? "testnet";
  if (rawNetwork !== "testnet" && rawNetwork !== "mainnet") {
    throw new Error("STELLAR_NETWORK must be 'testnet' or 'mainnet'.");
  }
  const network = rawNetwork;

  const defaults = {
    testnet: {
      horizonUrl: "https://horizon-testnet.stellar.org",
      rpcUrl: "https://soroban-testnet.stellar.org"
    },
    mainnet: {
      horizonUrl: "https://horizon.stellar.org",
      rpcUrl: "https://soroban.stellar.org"
    }
  };

  return {
    network,
    horizonUrl: process.env.STELLAR_HORIZON_URL ?? defaults[network].horizonUrl,
    rpcUrl: process.env.STELLAR_RPC_URL ?? defaults[network].rpcUrl
  };
}

export type AuthBaselineReport = {
  ok: boolean;
  nodeEnv: string;
  warnings: string[];
  errors: string[];
  auth: AuthConfig;
  stellar: StellarAuthConfig;
};

/**
 * AUTH-102/103/104: Shared auth config & environment baseline
 * - Wires env parsing/validation in one place
 * - Emits a high-signal report (warnings vs errors)
 * - Safe for startup-time checks (does not throw)
 */
export function getAuthBaselineReport(): AuthBaselineReport {
  const warnings: string[] = [];
  const errors: string[] = [];
  const nodeEnv = process.env.NODE_ENV ?? "development";

  let auth: AuthConfig;
  let stellar: StellarAuthConfig;

  try {
    auth = loadAuthConfig();
  } catch (err) {
    errors.push(String(err instanceof Error ? err.message : err));
    auth = {
      jwtSecret: "dev-secret-change-in-production",
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 604800,
      corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000"
    };
  }

  try {
    stellar = loadStellarAuthConfig();
  } catch (err) {
    errors.push(String(err instanceof Error ? err.message : err));
    stellar = {
      network: "testnet",
      horizonUrl: process.env.STELLAR_HORIZON_URL ?? "https://horizon-testnet.stellar.org",
      rpcUrl: process.env.STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org"
    };
  }

  if (nodeEnv !== "production" && !process.env.JWT_SECRET) {
    warnings.push("JWT_SECRET is not set; using development default.");
  }

  if (!process.env.ACCESS_TOKEN_TTL_SECONDS) {
    warnings.push("ACCESS_TOKEN_TTL_SECONDS is not set; using default (900 seconds).");
  }

  if (!process.env.REFRESH_TOKEN_TTL_SECONDS) {
    warnings.push("REFRESH_TOKEN_TTL_SECONDS is not set; using default (604800 seconds).");
  }

  if (!process.env.CORS_ORIGIN) {
    warnings.push("CORS_ORIGIN is not set; using default (http://localhost:3000).");
  }

  if (!process.env.STELLAR_NETWORK) {
    warnings.push("STELLAR_NETWORK is not set; using default (testnet).");
  }

  if (!process.env.STELLAR_HORIZON_URL) {
    warnings.push("STELLAR_HORIZON_URL is not set; using network default.");
  }

  if (!process.env.STELLAR_RPC_URL) {
    warnings.push("STELLAR_RPC_URL is not set; using network default.");
  }

  return {
    ok: errors.length === 0,
    nodeEnv,
    warnings,
    errors,
    auth,
    stellar
  };
}
