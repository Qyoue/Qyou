/**
 * Client-side structured audit logger for auth flows.
 *
 * Emits JSON-serialisable log lines to the browser console so contributors
 * can observe every checkpoint in the registration and login journeys.
 *
 * Checkpoints mirror the API-side events so traces can be correlated:
 *   REGISTER_ATTEMPT, REGISTER_INVALID, REGISTER_OK, REGISTER_ERROR
 *   LOGIN_ATTEMPT, LOGIN_INVALID, LOGIN_OK, LOGIN_ERROR
 */

type LogLevel = "info" | "warn" | "error";

export type AuthEvent =
  | "REGISTER_ATTEMPT"
  | "REGISTER_INVALID"
  | "REGISTER_OK"
  | "REGISTER_ERROR"
  | "LOGIN_ATTEMPT"
  | "LOGIN_INVALID"
  | "LOGIN_OK"
  | "LOGIN_ERROR";

export function logAuth(
  level: LogLevel,
  event: AuthEvent,
  data?: Record<string, unknown>
): void {
  const entry = { ts: new Date().toISOString(), level, event, ...data };
  // eslint-disable-next-line no-console
  console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
    JSON.stringify(entry)
  );
}
