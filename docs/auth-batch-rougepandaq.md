# Auth Batch Plan (rougepandaq)

Covers: AUTH-065, AUTH-066, AUTH-067, AUTH-068

## Mobile Password Recovery Verification
- Confirm reset request shows a privacy-safe response for any email.
- Confirm reset completion enforces minimum password rules.

## Biometric Session Restore
- Design:
- Entry points: app start and foreground resume.
- States: checking, biometric prompt, restored, fallback-to-login.
- Implementation baseline:
- Biometric prompt gated by stored user preference.
- On biometric failure/cancel, keep secure fallback to manual sign-in.
- Hardening checks:
- No plaintext token logging.
- Recovery path always available if biometric restore fails.
