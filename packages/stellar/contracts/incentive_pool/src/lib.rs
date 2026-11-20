#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, BytesN, Env,
    String,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    InsufficientBalance = 4,
    InvalidAmount = 5,
    Paused = 6,
    CapExceeded = 7,
    NoPendingAdmin = 8,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Token,
    Balance,
    UpgradeAdmin,
    Paused,
    /// Largest amount a single `distribute` call may pay out (0 / unset = no cap).
    MaxPerCall,
    PendingAdmin,
}

#[contract]
pub struct IncentivePoolContract;

#[contractimpl]
impl IncentivePoolContract {
    /// Initializes the incentive pool with the backend distribution admin, reward token address,
    /// and dedicated upgrade authority.
    pub fn initialize(
        env: Env,
        admin: Address,
        token: Address,
        upgrade_admin: Address,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Token, &token);
        env.storage().instance().set(&DataKey::UpgradeAdmin, &upgrade_admin);
        env.storage().instance().set(&DataKey::Balance, &0i128);

        Ok(())
    }

    /// Deposits funds into the incentive pool.
    /// Emits a deposit event and increases the internal pool accounting.
    pub fn deposit(env: Env, from: Address, amount: i128) -> Result<i128, Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        from.require_auth();

        let current_balance: i128 = env.storage().instance().get(&DataKey::Balance).unwrap_or(0);
        let new_balance = current_balance
            .checked_add(amount)
            .ok_or(Error::InvalidAmount)?;

        env.storage().instance().set(&DataKey::Balance, &new_balance);

        env.events().publish(
            (symbol_short!("deposit"), from),
            amount,
        );

        Ok(new_balance)
    }

    /// Distributes rewards from the incentive pool to a participant account.
    /// Strictly requires authorization by the Qyou backend admin key.
    pub fn distribute(
        env: Env,
        caller: Address,
        recipient: Address,
        amount: i128,
        idempotency_key: String,
    ) -> Result<i128, Error> {
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if env.storage().instance().get::<_, bool>(&DataKey::Paused).unwrap_or(false) {
            return Err(Error::Paused);
        }
        if let Some(cap) = env.storage().instance().get::<_, i128>(&DataKey::MaxPerCall) {
            if cap > 0 && amount > cap {
                return Err(Error::CapExceeded);
            }
        }

        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;

        // Contract-level access control: only the designated backend admin can distribute rewards
        if caller != admin {
            return Err(Error::Unauthorized);
        }
        caller.require_auth();

        let current_balance: i128 = env.storage().instance().get(&DataKey::Balance).unwrap_or(0);
        if current_balance < amount {
            return Err(Error::InsufficientBalance);
        }

        let new_balance = current_balance - amount;
        env.storage().instance().set(&DataKey::Balance, &new_balance);

        // Emit distribution event for backend reconciliation and indexing
        env.events().publish(
            (symbol_short!("distrib"), recipient, idempotency_key),
            amount,
        );

        Ok(new_balance)
    }

    /// Pauses distributions (admin only). Deposits and reads keep working.
    pub fn pause(env: Env, caller: Address) -> Result<(), Error> {
        Self::require_admin(&env, &caller)?;
        env.storage().instance().set(&DataKey::Paused, &true);
        env.events().publish((symbol_short!("paused"), caller), true);
        Ok(())
    }

    /// Resumes distributions (admin only).
    pub fn unpause(env: Env, caller: Address) -> Result<(), Error> {
        Self::require_admin(&env, &caller)?;
        env.storage().instance().set(&DataKey::Paused, &false);
        env.events().publish((symbol_short!("paused"), caller), false);
        Ok(())
    }

    pub fn is_paused(env: Env) -> bool {
        env.storage().instance().get(&DataKey::Paused).unwrap_or(false)
    }

    /// Sets the largest amount one `distribute` call may pay (admin only). 0 removes the cap.
    pub fn set_max_per_call(env: Env, caller: Address, max_amount: i128) -> Result<(), Error> {
        Self::require_admin(&env, &caller)?;
        if max_amount < 0 {
            return Err(Error::InvalidAmount);
        }
        env.storage().instance().set(&DataKey::MaxPerCall, &max_amount);
        Ok(())
    }

    pub fn get_max_per_call(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::MaxPerCall).unwrap_or(0)
    }

    /// Step one of an admin handover: the current admin nominates a successor.
    pub fn propose_admin(env: Env, caller: Address, new_admin: Address) -> Result<(), Error> {
        Self::require_admin(&env, &caller)?;
        env.storage().instance().set(&DataKey::PendingAdmin, &new_admin);
        env.events().publish((symbol_short!("adm_prop"), caller), new_admin);
        Ok(())
    }

    /// Step two: the nominated address accepts and becomes the admin, so a typo in
    /// the proposal cannot hand the pool to an address nobody controls.
    pub fn accept_admin(env: Env, new_admin: Address) -> Result<(), Error> {
        let pending: Address = env
            .storage()
            .instance()
            .get(&DataKey::PendingAdmin)
            .ok_or(Error::NoPendingAdmin)?;
        if new_admin != pending {
            return Err(Error::Unauthorized);
        }
        new_admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &new_admin);
        env.storage().instance().remove(&DataKey::PendingAdmin);
        env.events().publish((symbol_short!("adm_done"),), new_admin);
        Ok(())
    }

    /// Cancels a pending handover (admin only).
    pub fn cancel_admin_proposal(env: Env, caller: Address) -> Result<(), Error> {
        Self::require_admin(&env, &caller)?;
        env.storage().instance().remove(&DataKey::PendingAdmin);
        Ok(())
    }

    /// Extends the contract instance TTL so the pool does not expire (#1366). Anyone may call it
    /// (the caller pays); it only ever extends. `threshold` and `extend_to` are in ledgers.
    pub fn extend_instance_ttl(env: Env, threshold: u32, extend_to: u32) {
        env.storage().instance().extend_ttl(threshold, extend_to);
    }

    /// Returns the current total balance held by the incentive pool.
    pub fn get_balance(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::Balance).unwrap_or(0)
    }

    /// Returns the admin address authorized to distribute rewards.
    pub fn get_admin(env: Env) -> Result<Address, Error> {
        env.storage().instance().get(&DataKey::Admin).ok_or(Error::NotInitialized)
    }

    fn require_admin(env: &Env, caller: &Address) -> Result<(), Error> {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)?;
        if *caller != admin {
            return Err(Error::Unauthorized);
        }
        caller.require_auth();
        Ok(())
    }

    /// Upgrades the contract WASM bytecode in-place.
    /// Requires authorization from the designated upgrade authority.
    pub fn upgrade(env: Env, caller: Address, new_wasm_hash: BytesN<32>) -> Result<(), Error> {
        let upgrade_admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::UpgradeAdmin)
            .ok_or(Error::NotInitialized)?;

        if caller != upgrade_admin {
            return Err(Error::Unauthorized);
        }
        caller.require_auth();

        env.deployer().update_current_contract_wasm(new_wasm_hash);
        Ok(())
    }
}

#[cfg(test)]
mod test;
