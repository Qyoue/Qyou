export interface WebErrorReport {
  error: Error | string;
  context?: Record<string, unknown>;
  url?: string;
  timestamp: string;
}

export function reportWebError(error: Error | string, context?: Record<string, unknown>): void {
  const report: WebErrorReport = {
    error: typeof error === 'string' ? error : { name: error.name, message: error.message, stack: error.stack } as any,
    context,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    timestamp: new Date().toISOString(),
  };

  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    // Sentry SDK telemetry forwarder
    console.error('[Web Error Reporter: Sentry]', report);
  } else {
    console.error('[Web Error Reporter]', report);
  }
}
