# Auth Batch Plan (zakkiyyat)

Covers: AUTH-049, AUTH-050, AUTH-051, AUTH-052

## Web Session Shell (FE)
- Instrumentation events:
- `web_session_shell_loaded`
- `web_session_shell_refresh_started`
- `web_session_shell_refresh_succeeded`
- `web_session_shell_refresh_failed`
- Verification checks:
- Authenticated user sees shell chrome and account context.
- Expired session routes to login with a clear reason.

## Mobile Sign-Up (MB)
- Design:
- Inputs: email, password, confirm password.
- States: idle, submitting, success, failure.
- Implementation baseline:
- Email normalization before submit.
- Password length + confirm-password parity checks.
- Success state routes to sign-in.
