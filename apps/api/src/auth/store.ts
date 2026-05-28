/**
 * Shared in-memory account store.
 * Swap the Map for a DB adapter when persistence is needed.
 */

import type { AccountRecord } from "@qyou/types";

export const accountsByEmail = new Map<string, AccountRecord>();

export function getAccountByEmail(email: string): AccountRecord | undefined {
  return accountsByEmail.get(email.trim().toLowerCase());
}

/** For tests: seed an account directly. */
export function seedAccount(account: AccountRecord): void {
  accountsByEmail.set(account.email, account);
}

export function getAccountCount(): number {
  return accountsByEmail.size;
}

/** For tests: reset state. */
export function clearAccounts(): void {
  accountsByEmail.clear();
}
