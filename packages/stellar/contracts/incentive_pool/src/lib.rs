#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, Address, BytesN, Env,
    String, Symbol,
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
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Token,
    Balance,
    UpgradeAdmin,
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

    /// Returns the current total balance held by the incentive pool.
    pub fn get_balance(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::Balance).unwrap_or(0)
    }

    /// Returns the admin address authorized to distribute rewards.
    pub fn get_admin(env: Env) -> Result<Address, Error> {
        env.storage().instance().get(&DataKey::Admin).ok_or(Error::NotInitialized)
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
