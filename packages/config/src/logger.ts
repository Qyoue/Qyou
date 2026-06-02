export type LogLevel = "info" | "warn" | "error";

export type StructuredLoggerOptions = {
  /** High-level service name, e.g. "api" or "stellar-service". */
  service: string;
  /** Optional component/module name, e.g. "auth.login". */
  component?: string;
};

export type StructuredLogEntry = {
  ts: string;
  level: LogLevel;
  event: string;
  service: string;
  component?: string;
  [key: string]: unknown;
};

export function createStructuredLogger(options: StructuredLoggerOptions) {
  return (level: LogLevel, event: string, data?: Record<string, unknown>): void => {
    const entry: StructuredLogEntry = {
      ts: new Date().toISOString(),
      level,
      event,
      service: options.service,
      component: options.component,
      ...(data ?? {}),
    };

    // eslint-disable-next-line no-console
    console[level === "error" ? "error" : "log"](JSON.stringify(entry));
  };
}

