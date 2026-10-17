#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Env, String};

#[test]
fn test_initialize_and_deposit() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, IncentivePoolContract);
    let client = IncentivePoolContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let token = Address::generate(&env);
    let upgrade_admin = Address::generate(&env);

    client.initialize(&admin, &token, &upgrade_admin);
    assert_eq!(client.get_balance(), 0);
    assert_eq!(client.get_admin(), admin);

    let from = Address::generate(&env);
    let new_balance = client.deposit(&from, &100_000_000);
    assert_eq!(new_balance, 100_000_000);
    assert_eq!(client.get_balance(), 100_000_000);
}

#[test]
fn test_distribute_success() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, IncentivePoolContract);
    let client = IncentivePoolContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let token = Address::generate(&env);
    let upgrade_admin = Address::generate(&env);

    client.initialize(&admin, &token, &upgrade_admin);
    client.deposit(&admin, &50_000_000);

    let recipient = Address::generate(&env);
    let idempotency_key = String::from_str(&env, "reward:user123:queue456");
    let remaining = client.distribute(&admin, &recipient, &15_000_000, &idempotency_key);

    assert_eq!(remaining, 35_000_000);
    assert_eq!(client.get_balance(), 35_000_000);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_reject_double_initialization() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, IncentivePoolContract);
    let client = IncentivePoolContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let token = Address::generate(&env);
    let upgrade_admin = Address::generate(&env);

    client.initialize(&admin, &token, &upgrade_admin);
    client.initialize(&admin, &token, &upgrade_admin);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_distribute_insufficient_balance() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, IncentivePoolContract);
    let client = IncentivePoolContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let token = Address::generate(&env);
    let upgrade_admin = Address::generate(&env);

    client.initialize(&admin, &token, &upgrade_admin);
    client.deposit(&admin, &5_000_000);

    let recipient = Address::generate(&env);
    let idempotency_key = String::from_str(&env, "reward:overdraw");
    // Attempt to distribute 10_000_000 with only 5_000_000 in pool
    client.distribute(&admin, &recipient, &10_000_000, &idempotency_key);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_distribute_unauthorized_caller() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, IncentivePoolContract);
    let client = IncentivePoolContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let non_admin = Address::generate(&env);
    let token = Address::generate(&env);
    let upgrade_admin = Address::generate(&env);

    client.initialize(&admin, &token, &upgrade_admin);
    client.deposit(&admin, &20_000_000);

    let recipient = Address::generate(&env);
    let idempotency_key = String::from_str(&env, "reward:rogue");
    // Non-admin attempting to distribute rewards
    client.distribute(&non_admin, &recipient, &5_000_000, &idempotency_key);
}
