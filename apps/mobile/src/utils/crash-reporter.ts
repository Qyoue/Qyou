export interface CrashReportOptions {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  level?: "fatal" | "error" | "warning" | "info";
}

let sentryClientInitialized = false;

export function initCrashReporter(dsn?: string): void {
  const activeDsn = dsn ?? process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (activeDsn) {
    sentryClientInitialized = true;
  }
}

export function logException(error: Error, options?: CrashReportOptions): void {
  if (sentryClientInitialized || process.env.NODE_ENV === "production") {
    // Sentry / telemetry payload integration
    console.error("[Sentry Report]", {
      message: error.message,
      name: error.name,
      stack: error.stack,
      level: options?.level ?? "error",
      tags: options?.tags ?? {},
      extra: options?.extra ?? {},
      timestamp: new Date().toISOString(),
    });
    return;
  }
  console.error("Exception captured:", error, options);
}

export function isCrashReporterActive(): boolean {
  return sentryClientInitialized;
}
