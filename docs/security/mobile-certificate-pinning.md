# Mobile certificate pinning: decision (#1355)

**Decision: do not enable pinning yet.** Revisit when the API has a stable production domain and a rotation process.

Reasons:

- A wrong or expired pin locks every installed app out of the API until users update; there is no stable domain,
  certificate authority or rotation runbook yet.
- The app has no sign-in or key custody today, so the extra protection (defence against a rogue CA or a
  user-installed root) is small compared with the outage risk.
- TLS and HSTS on the API already cover the common network attacker.

If enabled later, follow `apps/mobile/src/security/certificatePinning.ts`:

1. Pin the **SPKI hash** of an intermediate or the leaf **key** (not the leaf certificate), at least two pins (current and backup key).
2. Ship the pin set with an `expiresAt` so an overlooked rotation fails open after the date, and release a build with
   the new pins before rotating the server key.
3. Test with a deliberately wrong pin in staging before production.

The module only validates the pin configuration and the chain match; the native integration is not wired.
