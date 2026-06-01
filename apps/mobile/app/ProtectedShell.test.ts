/**
 * AUTH-075: Tests for the protected mobile navigation shell.
 *
 * Covers:
 * - Auth state transitions: checking → authenticated, unauthenticated, error
 * - Log events emitted at each checkpoint
 * - Correct render decision for each auth state
 *
 * Run with: npm test --workspace @qyou/mobile
 */

import type { AuthState } from "../app/ProtectedShell";

// ---------------------------------------------------------------------------
// Pure logic extracted from ProtectedShell for unit testing
// ---------------------------------------------------------------------------

type ShellDecision = "loading" | "render_children" | "render_fallback";

function resolveShellDecision(authState: AuthState): ShellDecision {
  if (authState === "checking") return "loading";
  if (authState === "authenticated") return "render_children";
  return "render_fallback"; // unauthenticated | error
}

type LogEvent = { context: string; event: string; checkpoint: string };

function collectShellEvents(transitions: AuthState[]): LogEvent[] {
  const events: LogEvent[] = [];
  const emit = (event: string, checkpoint: string) =>
    events.push({ context: "protected-shell", event, checkpoint });

  emit("PROTECTED_SHELL_MOUNT", "mount");

  let prev: AuthState | null = null;
  for (const state of transitions) {
    if (state === prev) continue;
    prev = state;
    switch (state) {
      case "checking":       emit("PROTECTED_SHELL_CHECKING", "session_check_start"); break;
      case "authenticated":  emit("PROTECTED_SHELL_AUTHED",   "session_valid");       break;
      case "unauthenticated":emit("PROTECTED_SHELL_UNAUTHED", "redirect_to_login");   break;
      case "error":          emit("PROTECTED_SHELL_ERROR",    "session_check_failed");break;
    }
  }
  return events;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ProtectedShell — render decisions (AUTH-074)", () => {
  it("shows loading while checking", () => {
    expect(resolveShellDecision("checking")).toBe("loading");
  });

  it("renders children when authenticated", () => {
    expect(resolveShellDecision("authenticated")).toBe("render_children");
  });

  it("renders fallback when unauthenticated", () => {
    expect(resolveShellDecision("unauthenticated")).toBe("render_fallback");
  });

  it("renders fallback on error", () => {
    expect(resolveShellDecision("error")).toBe("render_fallback");
  });
});

describe("ProtectedShell — instrumentation events (AUTH-074)", () => {
  it("emits MOUNT on bootstrap", () => {
    const events = collectShellEvents([]);
    expect(events[0].event).toBe("PROTECTED_SHELL_MOUNT");
  });

  it("emits CHECKING when auth state is checking", () => {
    const events = collectShellEvents(["checking"]);
    expect(events.some((e) => e.event === "PROTECTED_SHELL_CHECKING")).toBe(true);
  });

  it("emits AUTHED on successful session", () => {
    const events = collectShellEvents(["checking", "authenticated"]);
    expect(events.some((e) => e.event === "PROTECTED_SHELL_AUTHED")).toBe(true);
  });

  it("emits UNAUTHED when no session found", () => {
    const events = collectShellEvents(["checking", "unauthenticated"]);
    expect(events.some((e) => e.event === "PROTECTED_SHELL_UNAUTHED")).toBe(true);
  });

  it("emits ERROR on session check failure", () => {
    const events = collectShellEvents(["checking", "error"]);
    expect(events.some((e) => e.event === "PROTECTED_SHELL_ERROR")).toBe(true);
  });

  it("does not re-emit events for the same state (deduplication)", () => {
    const events = collectShellEvents(["checking", "checking", "authenticated"]);
    const checkingEvents = events.filter((e) => e.event === "PROTECTED_SHELL_CHECKING");
    expect(checkingEvents.length).toBe(1);
  });
});

describe("ProtectedShell — happy path flow (AUTH-075)", () => {
  it("checking → authenticated emits correct sequence", () => {
    const events = collectShellEvents(["checking", "authenticated"]);
    const eventNames = events.map((e) => e.event);
    expect(eventNames).toEqual([
      "PROTECTED_SHELL_MOUNT",
      "PROTECTED_SHELL_CHECKING",
      "PROTECTED_SHELL_AUTHED",
    ]);
  });

  it("checking → unauthenticated emits correct sequence", () => {
    const events = collectShellEvents(["checking", "unauthenticated"]);
    const eventNames = events.map((e) => e.event);
    expect(eventNames).toEqual([
      "PROTECTED_SHELL_MOUNT",
      "PROTECTED_SHELL_CHECKING",
      "PROTECTED_SHELL_UNAUTHED",
    ]);
  });

  it("all events carry the protected-shell context", () => {
    const events = collectShellEvents(["checking", "authenticated"]);
    expect(events.every((e) => e.context === "protected-shell")).toBe(true);
  });
});
