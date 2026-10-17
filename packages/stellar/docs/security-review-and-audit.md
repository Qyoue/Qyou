# IncentivePool Smart Contract: Security Review and Audit Specification

## 1. Scope & Objective

This document defines the formal security review process, vulnerability threat model, and sign-off criteria for the Qyou `IncentivePool` Soroban smart contract prior to mainnet deployment.

The contract holds pooled funds and distributes incentives to queue participants. As an automated treasury mechanism, defense-in-depth is required across authorization, state consistency, and arithmetic safety.

---

## 2. Threat Analysis & Defensive Invariants

### 2.1 Reentrancy & Cross-Contract Calls
- **Risk**: External calls during distribution could invoke malicious callbacks before state updates.
- **Soroban Context**: Soroban operates within a deterministic, metered WebAssembly VM with strict execution frames.
- **Mitigation**: All internal balance state mutations occur *prior* to cross-contract token transfer calls (Checks-Effects-Interactions pattern).

### 2.2 Access Control & Privilege Escalation
- **Risk**: Unauthorized actors triggering distributions or overriding contract logic.
- **Mitigation**:
  - `distribute`: Restricted strictly to `DataKey::Admin` via `admin.require_auth()`.
  - `upgrade`: Restricted strictly to `DataKey::UpgradeAdmin` via `upgrade_admin.require_auth()`.
  - Keys are separated: the distribution operator hot key cannot execute code upgrades.

### 2.3 Integer Overflow / Underflow
- **Risk**: Arithmetic overflow allowing infinite balance generation or underflow balance bypass.
- **Mitigation**:
  - All balance calculations use `i128` types with checked math (`checked_add`, `checked_sub`).
  - Zero and negative amounts are explicitly rejected with `Error::InvalidAmount`.

### 2.4 Idempotency & Replay Attacks
- **Risk**: Network retries causing double-payouts for a single queue event.
- **Mitigation**:
  - Every distribution request includes a unique `idempotency_key` emitted in the on-chain event log.
  - The client and backend reconcile against existing idempotency keys before dispatch.

---

## 3. Pre-Mainnet Audit Sign-Off Matrix

Before any mainnet deployment, the following verification gates must be signed off:

| Review Area | Verification Method | Status | Signer |
|---|---|---|---|
| **Static Analysis** | Automated Clippy & Slither/Soroban checks | Passed | Engineering Lead |
| **Edge-Case Unit Tests** | 100% test coverage including zero balance, double distribution, uninitialized invocation | Passed | QA Lead |
| **Authorization Hardening** | Negative authorization tests for non-admin callers | Passed | Security Lead |
| **Independent External Audit** | Third-party smart contract security audit firm | Required | External Auditor |
