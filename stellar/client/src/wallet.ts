import { Keypair } from '@stellar/stellar-sdk';

export class WalletManager {
  static createRandom() {
    const pair = Keypair.random();
    return {
      publicKey: pair.publicKey(),
      secret: pair.secret(),
      pair: pair,
    };
  }

  static fromSecret(secret: string) {
    try {
      const pair = Keypair.fromSecret(secret);
      return {
        publicKey: pair.publicKey(),
        secret: pair.secret(),
        pair: pair,
      };
    } catch (e) {
      throw new Error('Invalid Stellar Secret Key provided.');
    }
  }

  static async fundAccount(publicKey: string): Promise<boolean> {
    console.log(`🤖 Summoning Friendbot to fund: ${publicKey.slice(0, 8)}...`);

    try {
      const response = await fetch(
        `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`,
      );
      const data = await response.json();

      if (response.ok) {
        console.log(`✅ Friendbot successfully funded the account!`);
        return true;
      } else {
        console.error(' Friendbot failed:', data);
        return false;
      }
    } catch (e: any) {
      console.error(' Network error contacting Friendbot:', e.message);
      return false;
    }
  }
}
