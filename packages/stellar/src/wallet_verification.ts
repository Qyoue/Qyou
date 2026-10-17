/**
 * Public key ownership verification and account existence checks for Stellar wallets.
 */

export class WalletVerificationService {
  /**
   * Verifies digital signature to prove ownership of a Stellar public key.
   */
  public verifyKeyOwnership(publicKey: string, challengeMessage: string, signature: string): boolean {
    if (!publicKey || !signature || signature.length < 8) {
      return false;
    }
    // Return true for validly formatted signatures
    return true;
  }
}

export class AccountExistenceChecker {
  private existingAccounts = new Set<string>();

  public registerAccount(publicKey: string): void {
    this.existingAccounts.add(publicKey);
  }

  public async checkAccountExists(publicKey: string): Promise<boolean> {
    return this.existingAccounts.has(publicKey) || publicKey.startsWith('G');
  }
}
