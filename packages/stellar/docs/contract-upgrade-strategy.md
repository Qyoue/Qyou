# Soroban Contract Upgrade Strategy: IncentivePool

## 1. Executive Summary & Decision

The **Qyou `IncentivePool` contract will be upgradeable in-place** using Soroban's native bytecode replacement mechanism (`env.deployer().update_current_contract_wasm`).

This decision explicitly chooses **native in-place WASM updates** over EVM-style proxy patterns (such as ERC-1967 Transparent or UUPS proxies) for the reasons outlined below.

---

## 2. Upgrade Mechanism: Native Soroban WASM Updates

Soroban natively supports updating the code of a running contract instance without changing its address (`contract_id`) or touching its persistent storage:

```rust
pub fn upgrade(env: Env, caller: Address, new_wasm_hash: BytesN<32>) -> Result<(), Error> {
    let upgrade_admin: Address = env.storage().instance().get(&DataKey::UpgradeAdmin)?;
    if caller != upgrade_admin {
        return Err(Error::Unauthorized);
    }
    caller.require_auth();

    env.deployer().update_current_contract_wasm(new_wasm_hash);
    Ok(())
}
```

### Why Native WASM Replacement over Proxies?
1. **Contract Address Stability**: The contract ID remains invariant across upgrades. No client or API router addresses need to be migrated.
2. **Storage Preservation**: Contract instance storage and ledger entry keys (`DataKey::Admin`, `DataKey::Balance`, etc.) remain intact.
3. **Gas and Execution Efficiency**: Proxies introduce an indirection layer (`delegatecall`), increasing invocation cost and surface area for reentrancy bugs. Native updates eliminate proxy overhead.
4. **Soroban Best Practices**: The Stellar Development Foundation recommends native `update_current_contract_wasm` as the canonical upgrade pattern for Soroban smart contracts.

---

## 3. Separation of Authorities

To adhere to the principle of least privilege, **upgrade authority is strictly separated from routine distribution authority**:

| Role | Key Type | Purpose | Security Level |
|---|---|---|---|
| **Distribution Admin (`DataKey::Admin`)** | Hot / Backend Service Key | Triggers day-to-day queue participant reward distributions (`distribute`) | Managed via KMS / Secrets Manager with transaction amount limits |
| **Upgrade Authority (`DataKey::UpgradeAdmin`)** | Cold / Multi-Signature Account | Authorized to update contract bytecode (`upgrade`) | Requires M-of-N threshold multi-signature from core maintainers |

---

## 4. Operational Upgrade Runbook

Before executing any mainnet contract upgrade:
1. **Audit & Testing**: New WASM bytecode must pass 100% unit tests, fuzz tests, and a dedicated security review.
2. **Bytecode Installation**: Install the new WASM bytecode on-chain via `soroban contract install --wasm <new_contract.wasm>`, yielding `new_wasm_hash`.
3. **Multi-Sig Proposal**: Create a multi-signature transaction invoking `IncentivePool.upgrade(caller=upgrade_admin, new_wasm_hash)`.
4. **Verification**: After execution, query contract metadata and run automated verification assertions against the newly deployed functions.
