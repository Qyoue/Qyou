# Mainnet Contract Deployment Runbook: IncentivePool

## 1. Overview & Objective

This runbook defines the required protocol and verification steps for deploying the Qyou `IncentivePool` Soroban smart contract to the **Stellar Mainnet (Public Network)**.

Because smart contracts holding real assets cannot be rolled back without explicit governance actions, all deployments to mainnet must strictly follow this procedure with formal multi-party sign-off.

---

## 2. Pre-Deployment Checklist

Before initiating deployment:
- [ ] **Audit Sign-off**: Contract code has completed an internal security review and external third-party audit with all High/Medium issues resolved.
- [ ] **Bytecode Optimization**: WASM bytecode compiled with `--release` and passed through `soroban contract optimize` to minimize ledger footprint and invocation gas.
- [ ] **Key Management**:
  - `adminAddress` (distribution operator): Configured with a dedicated secure backend KMS key.
  - `upgradeAdminAddress`: Configured with an M-of-N multi-signature cold wallet (minimum 2-of-3 threshold).
- [ ] **Token Availability**: Reward token contract address on mainnet verified and funded.
- [ ] **Testnet Parity**: Full end-to-end integration and smoke tests have run against Stellar Testnet within the last 24 hours without failures.

---

## 3. Multi-Party Approval & Sign-Off

At least two engineering and operations leads must verify and sign off on deployment parameters:

| Role | Name | Public Key Fingerprint | Approval Timestamp |
|---|---|---|---|
| **Security Lead** | ____________________ | ____________________ | ____________________ |
| **Engineering Lead** | ____________________ | ____________________ | ____________________ |

---

## 4. Execution Steps

### Step 4.1: Install WASM Bytecode On-Chain
Using the Soroban CLI and a hardware-protected deployer key:

```bash
soroban contract install \
  --network public \
  --source <DEPLOYER_ACCOUNT> \
  --wasm target/wasm32-unknown-unknown/release/incentive_pool.optimized.wasm
```

Record the resulting **WASM Hash** (`WASM_HASH`).

### Step 4.2: Instantiate Contract
Deploy the contract instance using the installed WASM hash:

```bash
soroban contract deploy \
  --network public \
  --source <DEPLOYER_ACCOUNT> \
  --wasm-hash <WASM_HASH>
```

Record the resulting **Contract ID** (`CONTRACT_ID` starting with `C...`).

### Step 4.3: Initialize Contract Parameters
Execute the one-time `initialize` invocation:

```bash
soroban contract invoke \
  --network public \
  --source <ADMIN_ACCOUNT> \
  --id <CONTRACT_ID> \
  -- \
  initialize \
  --admin <DISTRIBUTION_ADMIN_ADDRESS> \
  --token <REWARD_TOKEN_ADDRESS> \
  --upgrade_admin <UPGRADE_ADMIN_MULTISIG_ADDRESS>
```

---

## 5. Post-Deployment Verification

1. **Verify State**:
   Execute read-only queries to confirm initialization:
   ```bash
   soroban contract invoke --network public --id <CONTRACT_ID> -- get_admin
   soroban contract invoke --network public --id <CONTRACT_ID> -- get_balance
   ```
2. **Initial Pool Funding**:
   Transfer the initial seed deposit into the pool using the `deposit` function.
3. **Canary Distribution**:
   Execute a 1-unit canary payout to an internal test address and verify event emission.
4. **Environment Configuration**:
   Update production secrets manager with `STELLAR_INCENTIVE_POOL_CONTRACT_ID`.

---

## 6. Emergency Abort & Incident Protocol

In the event of unexpected behavior during post-deployment verification:
1. Halt any automated distribution cron jobs immediately.
2. If funds are compromised or abnormal events are detected, use the cold upgrade multi-sig key to deploy a freeze stub.
3. Document incident timeline and notify security leads.
