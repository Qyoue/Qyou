import { config as loadDotenv } from "dotenv";

loadDotenv();

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
