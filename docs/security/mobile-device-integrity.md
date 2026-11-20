# Mobile jailbreak / root detection: policy decision (#1354)

**Decision:** detect, warn, and restrict sensitive actions; do not hard-block the whole app.

- A compromised device (known jailbreak/root paths found, or a debugger attached) can still **view** data, with a
  warning. It cannot **link a wallet, reveal a key or sign a transaction** (`decide()` in
  `apps/mobile/src/security/deviceIntegrity.ts`).
- Why not a full block: detection is heuristic and trivially bypassed by a determined attacker, and blocking
  would punish legitimate users (custom ROMs, developers) for little protection. Restricting key operations
  limits the damage where it matters.
- Emulators are not treated as compromised so development and CI keep working.

Limits: path checks need a native file-system call (injected as `fileExists`); attestation APIs (Play
Integrity, App Attest) are stronger and are the recommended follow-up before any custodial feature ships.
