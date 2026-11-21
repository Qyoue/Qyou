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

fn setup(env: &Env) -> (IncentivePoolContractClient<'_>, Address) {
    env.mock_all_auths();
    let contract_id = env.register_contract(None, IncentivePoolContract);
    let client = IncentivePoolContractClient::new(env, &contract_id);
    let admin = Address::generate(env);
    client.initialize(&admin, &Address::generate(env), &Address::generate(env));
    client.deposit(&admin, &100_000_000);
    (client, admin)
}

#[test]
fn test_pause_blocks_distribute_and_unpause_resumes() {
    let env = Env::default();
    let (client, admin) = setup(&env);
    let recipient = Address::generate(&env);
    let key = String::from_str(&env, "k1");

    client.pause(&admin);
    assert!(client.is_paused());
    assert_eq!(
        client.try_distribute(&admin, &recipient, &1_000_000, &key),
        Err(Ok(Error::Paused))
    );
    // Deposits still work while paused.
    client.deposit(&admin, &1_000_000);

    client.unpause(&admin);
    assert!(!client.is_paused());
    client.distribute(&admin, &recipient, &1_000_000, &key);
}

#[test]
fn test_only_admin_can_pause() {
    let env = Env::default();
    let (client, _admin) = setup(&env);
    let stranger = Address::generate(&env);
    assert_eq!(client.try_pause(&stranger), Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_per_call_cap() {
    let env = Env::default();
    let (client, admin) = setup(&env);
    let recipient = Address::generate(&env);
    let key = String::from_str(&env, "k1");

    client.set_max_per_call(&admin, &5_000_000);
    assert_eq!(client.get_max_per_call(), 5_000_000);
    assert_eq!(
        client.try_distribute(&admin, &recipient, &5_000_001, &key),
        Err(Ok(Error::CapExceeded))
    );
    client.distribute(&admin, &recipient, &5_000_000, &key);

    // 0 removes the cap.
    client.set_max_per_call(&admin, &0);
    client.distribute(&admin, &recipient, &20_000_000, &key);
}

#[test]
fn test_two_step_admin_handover() {
    let env = Env::default();
    let (client, admin) = setup(&env);
    let successor = Address::generate(&env);
    let stranger = Address::generate(&env);

    assert_eq!(client.try_accept_admin(&successor), Err(Ok(Error::NoPendingAdmin)));
    client.propose_admin(&admin, &successor);
    // Only the nominated address can accept.
    assert_eq!(client.try_accept_admin(&stranger), Err(Ok(Error::Unauthorized)));
    // The old admin keeps control until acceptance.
    assert_eq!(client.get_admin(), admin);

    client.accept_admin(&successor);
    assert_eq!(client.get_admin(), successor);
    // The previous admin can no longer pause.
    assert_eq!(client.try_pause(&admin), Err(Ok(Error::Unauthorized)));
}

#[test]
fn test_cancel_admin_proposal() {
    let env = Env::default();
    let (client, admin) = setup(&env);
    let successor = Address::generate(&env);
    client.propose_admin(&admin, &successor);
    client.cancel_admin_proposal(&admin);
    assert_eq!(client.try_accept_admin(&successor), Err(Ok(Error::NoPendingAdmin)));
}

#[test]
fn test_extend_instance_ttl_is_callable() {
    let env = Env::default();
    let (client, _admin) = setup(&env);
    client.extend_instance_ttl(&100, &200);
}
