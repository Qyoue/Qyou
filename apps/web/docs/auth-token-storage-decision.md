# Auth Token Storage Decision (#1305)

## Current state
- Auth state/tokens are persisted client-side in `localStorage` (`qyou.web_auth_v2` / app auth storage).
- This exposes tokens to theft if an XSS vulnerability executes in the browser.

## Decision
- **Target architecture:** move refresh/session tokens to `httpOnly`, `Secure`, `SameSite` cookies and keep access tokens in memory where possible.
- **Interim mitigation (until backend cookie auth migration is complete):**
  - Tighten CSP (`connect-src` limited to self + API origin, nonce-based CSP/report-only rollout for scripts).
  - Keep token lifetime short and rotate/refresh tokens.
  - Avoid logging tokens and avoid exposing them in URLs.
  - Maintain route protection middleware and security headers (HSTS, Permissions-Policy, XFO, nosniff).

## Migration notes
- Backend must issue/set/clear httpOnly cookies for login/refresh/logout.
- Frontend auth client should switch to cookie-based session requests (`credentials: include`) and in-memory access token handling.
- Add CSRF protection for cookie-authenticated mutating endpoints.
