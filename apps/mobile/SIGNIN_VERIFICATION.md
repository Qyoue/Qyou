# Mobile Sign-In Verification

- Route opens at `/login` and renders email, password, and submit controls.
- Empty submit returns a validation error and increments the attempt counter.
- After five failed attempts, the flow blocks with a lockout-style message.
- Event logs emit for `signin_failed`, `signin_blocked`, and `signin_succeeded`.

Mapped issues: AUTH-057, AUTH-058, AUTH-059, AUTH-060.
