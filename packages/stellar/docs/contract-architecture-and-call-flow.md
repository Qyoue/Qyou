# IncentivePool Smart Contract Architecture and Call Flow

## 1. Overview

The `IncentivePool` smart contract manages tokenized incentives distributed to users upon completing verified queue actions within the Qyou ecosystem.

It provides transparent, auditable on-chain proof of reward distribution while abstracting blockchain complexity away from user-facing queue flows.

---

## 2. Storage Layout & Data Keys

The contract instance storage maintains the following entries:

| Storage Key | Type | Description |
|---|---|---|
| `DataKey::Admin` | `Address` | Backend distribution service address authorized to call `distribute` |
| `DataKey::Token` | `Address` | Address of the asset/token contract used for payouts |
| `DataKey::Balance` | `i128` | Total available reward pool balance |
| `DataKey::UpgradeAdmin` | `Address` | Cold governance key authorized to invoke in-place WASM upgrades |

---

## 3. Public Entrypoints

### `initialize(admin: Address, token: Address, upgrade_admin: Address) -> Result<(), Error>`
- Sets initial admin, token contract, and upgrade authority.
- Callable only once during contract deployment.

### `deposit(from: Address, amount: i128) -> Result<i128, Error>`
- Funds the reward pool.
- Requires authorization from the depositing address.
- Emits `(symbol_short!("deposit"), from)` event.

### `distribute(caller: Address, recipient: Address, amount: i128, idempotency_key: String) -> Result<i128, Error>`
- Releases rewards to a participant account.
- Verifies `caller == Admin` and `caller.require_auth()`.
- Verifies `amount <= Balance`.
- Emits `(symbol_short!("distrib"), recipient, idempotency_key)` event.

### `get_balance() -> i128`
- Read-only query returning current pool balance.

### `get_admin() -> Result<Address, Error>`
- Read-only query returning authorized distribution admin address.

### `upgrade(caller: Address, new_wasm_hash: BytesN<32>) -> Result<(), Error>`
- Updates contract bytecode in-place.
- Requires `caller == UpgradeAdmin` and `caller.require_auth()`.

---

## 4. End-to-End Call Flow

The diagram below illustrates how `apps/api` invokes the contract upon queue completion:

```text
User / Mobile           Qyou API Server             IncentivePoolClient          Soroban Contract
    │                          │                             │                           │
    │── Queue Completed ──────>│                             │                           │
    │                          │── Verify Eligibility        │                           │
    │                          │── Generate IdempotencyKey   │                           │
    │                          │                             │                           │
    │                          │── distribute(params) ──────>│                           │
    │                          │                             │── Build & Sign Tx ───────>│
    │                          │                             │   (Admin Key Authorization)│
    │                          │                             │                           │── Check Admin Auth
    │                          │                             │                           │── Check Balance
    │                          │                             │                           │── Deduct & Transfer
    │                          │                             │                           │── Emit Event
    │                          │                             │<── Confirmed Tx & Hash ───│
    │                          │<── DistributionResult ──────│                           │
    │                          │                             │                           │
    │                          │── Record In Database        │                           │
    │<── Reward Confirmed ─────│                             │                           │
```
