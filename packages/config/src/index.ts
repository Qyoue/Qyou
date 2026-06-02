import { config as loadDotenv } from "dotenv";

loadDotenv();

export { createStructuredLogger } from "./logger.js";
export type { LogLevel, StructuredLogEntry, StructuredLoggerOptions } from "./logger.js";

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

  return {
    jwtSecret: jwtSecret ?? "dev-secret-change-in-production",
    accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900),
    refreshTokenTtlSeconds: Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? 604800),
    corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000"
  };
}

/**
 * Load Stellar-specific auth config from environment variables.
 */
export function loadStellarAuthConfig(): StellarAuthConfig {
  const network = (process.env.STELLAR_NETWORK ?? "testnet") as "testnet" | "mainnet";

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
