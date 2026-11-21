export interface MobileEnvConfig {
  apiUrl: string;
  isProduction: boolean;
  isStaging: boolean;
}

export function validateEnvironment(env: Record<string, string | undefined> = process.env): MobileEnvConfig {
  const isProduction = env.NODE_ENV === "production";
  const isStaging = env.EXPO_PUBLIC_APP_ENV === "staging";
  const rawApiUrl = env.EXPO_PUBLIC_API_URL;

  if (isProduction && !rawApiUrl) {
    throw new Error("MissingRequiredEnv: EXPO_PUBLIC_API_URL must be provided in release/production builds");
  }

  const apiUrl = rawApiUrl ?? (isStaging ? "https://api-staging.qyou.org" : "https://api.qyou.local");

  return {
    apiUrl,
    isProduction,
    isStaging,
  };
}

export const envConfig = validateEnvironment();
export const API_BASE_URL = envConfig.apiUrl;
