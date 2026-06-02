# AUTH-071 — Protected Mobile Navigation Shell Design

## Goal

Gate all authenticated screens behind a single shell component that checks session state on mount, shows a spinner during the check, renders children when authenticated, and redirects to login otherwise.

## Flow

```
App mounts
  └─ ProtectedShell mounts
       └─ authState = "checking"   → spinner shown
            ├─ session valid       → authState = "authenticated"  → render children
            ├─ no session          → authState = "unauthenticated" → render fallback / redirect
            └─ restore error       → authState = "error"          → render fallback / redirect
```

## Auth States

| State            | Trigger                                    | Shell output         |
|------------------|--------------------------------------------|----------------------|
| `checking`       | Mount; session check in progress           | `<ActivityIndicator>`|
| `authenticated`  | Session restore succeeded                  | `{children}`         |
| `unauthenticated`| No stored token / biometric cancelled      | `fallback` prop      |
| `error`          | Storage read error or unexpected throw     | `fallback` prop      |

## Interfaces

```typescript
// apps/mobile/app/ProtectedShell.tsx

export type AuthState = "checking" | "authenticated" | "unauthenticated" | "error";

export type ProtectedShellProps = {
  authState: AuthState;          // resolved externally (hook or parent)
  children: React.ReactNode;     // rendered only when authenticated
  fallback?: React.ReactNode;    // shown for unauthenticated / error states
};
```

The shell is **stateless with respect to auth resolution** — the caller provides `authState` so the shell is easy to test and reuse without coupling to any specific storage or biometric backend.

Session restore mechanics (SecureStore + biometric prompt) live in `src/biometric-session.ts` and `src/ProtectedShell.tsx` (AUTH-070 / AUTH-072), which drive the `authState` value passed into this shell.

## Failure States

| Scenario                        | `authState`      | User sees                                 |
|---------------------------------|------------------|-------------------------------------------|
| No stored session token         | `unauthenticated` | Fallback — "Please sign in to continue." |
| Biometric cancelled by user     | `unauthenticated` | Same fallback                            |
| SecureStore read throws         | `error`           | Same fallback                            |
| Biometric hardware unavailable  | `unauthenticated` | Same fallback (no biometric path taken)  |
| Bootstrap in progress           | `checking`        | Spinner — no protected content visible   |

No protected content is rendered until `authState` resolves to `authenticated`. The `checking` → render guard prevents flash of authenticated UI.

## Instrumentation

Structured log events are emitted at each state transition (AUTH-074):

| Event                      | Checkpoint              |
|----------------------------|-------------------------|
| `PROTECTED_SHELL_MOUNT`    | `mount`                 |
| `PROTECTED_SHELL_CHECKING` | `session_check_start`   |
| `PROTECTED_SHELL_AUTHED`   | `session_valid`         |
| `PROTECTED_SHELL_UNAUTHED` | `redirect_to_login`     |
| `PROTECTED_SHELL_ERROR`    | `session_check_failed`  |
| `PROTECTED_SHELL_UNMOUNT`  | `unmount`               |

Duplicate transitions are suppressed — a state repeated without change emits no extra event.

## Implementation Boundaries

| Surface                         | Owns                                              |
|---------------------------------|---------------------------------------------------|
| `app/ProtectedShell.tsx`        | Shell render logic + instrumentation              |
| `src/biometric-session.ts`      | SecureStore + biometric adapter interfaces        |
| `src/ProtectedShell.tsx`        | Adapter-injected restore shell (testable variant) |
| `app/ProtectedShell.test.ts`    | Unit tests for render decisions and log events    |
| Caller / navigation layout      | Drives `authState` and handles `fallback` routing |

## Tradeoffs

- **Caller-owned `authState`** — keeps the shell pure and testable; callers must wire up their own `useSession` hook or equivalent.
- **No retry logic in the shell** — retries belong in the biometric restore layer, not the UI shell.
- **Spinner as default fallback** — avoids layout shift; callers can override `loadingFallback` for branded screens.

## Verification

```bash
npm test --workspace @qyou/mobile
```

Tests in `app/ProtectedShell.test.ts` cover all state transitions, log event sequences, and deduplication. See also `src/biometric-session.test.ts` for storage and biometric adapter coverage.
