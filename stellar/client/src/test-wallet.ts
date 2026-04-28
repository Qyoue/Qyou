/**
 * Test-only wallet utilities.
 * Friendbot and test helpers are isolated here — never import this in production code.
 */
import { server as stellarServer } from './index';
import { Horizon } from '@stellar/stellar-sdk';
import { createTestWallet } from './wallet';

/** Fund a testnet account via Friendbot. Only valid on TESTNET. */
export async function friendbotFund(publicKey: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`,
    );
    if (!res.ok) {
      const body = await res.json();
      console.error('Friendbot error:', body);
      return false;
    }
    console.log(`✅ Friendbot funded: ${publicKey.slice(0, 8)}...`);
    return true;
  } catch (e: any) {
    console.error('Friendbot network error:', e.message);
    return false;
  }
}

/** Create a fresh testnet wallet and fund it via Friendbot. */
export async function createFundedTestWallet() {
  const wallet = createTestWallet();
  const funded = await friendbotFund(wallet.publicKey);
  if (!funded) throw new Error('Friendbot funding failed');
  return wallet;
}

/** Verify a testnet account exists and return its XLM balance. */
export async function getTestBalance(publicKey: string): Promise<string> {
  const account = await stellarServer.loadAccount(publicKey);
  const xlm = account.balances.find(
    (b: Horizon.HorizonApi.BalanceLine) => b.asset_type === 'native',
  );
  return xlm?.balance ?? '0';
}

export async function smokeTestWallet(): Promise<boolean> {
  try {
    const wallet = createTestWallet();
    return !!(wallet.publicKey && wallet.secret);
  } catch {
    return false;
  }
}

// Run directly: tsx src/test-wallet.ts
if (require.main === module) {
  (async () => {
    console.log('--- Wallet & Friendbot Test ---');
    const wallet = await createFundedTestWallet();
    console.log('Public:', wallet.publicKey);
    const balance = await getTestBalance(wallet.publicKey);
    console.log('Balance:', balance, 'XLM');
  })();
}
