/**
 * Multi-Signature Configuration & Threshold Policies (#1026)
 *
 * Configures the Stellar distribution/issuing account with multi-sig requirements,
 * eliminating single-key points of failure.
 */

export interface MultiSigSigner {
  readonly publicKey: string;
  readonly weight: number;
}

export interface MultiSigThresholdPolicy {
  readonly accountId: string;
  readonly masterWeight: number;
  readonly lowThreshold: number;   // E.g., trustlines, sequence bumps
  readonly medThreshold: number;   // E.g., payments, incentive distributions (requires 2-of-3)
  readonly highThreshold: number;  // E.g., account threshold changes, signers (requires 3-of-3)
  readonly signers: readonly MultiSigSigner[];
}

export interface MultiSigValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly totalWeight: number;
}

export class MultiSigService {
  /**
   * Validates that a multi-sig threshold policy meets safety and quorum invariants.
   */
  public static validatePolicy(policy: MultiSigThresholdPolicy): MultiSigValidationResult {
    const errors: string[] = [];

    if (!policy.accountId || !/^G[A-Z2-7]{55}$/.test(policy.accountId)) {
      errors.push('Invalid accountId format: must be a valid Stellar public key');
    }

    if (policy.lowThreshold <= 0) {
      errors.push('lowThreshold must be strictly greater than 0');
    }

    if (policy.medThreshold < policy.lowThreshold) {
      errors.push('medThreshold cannot be lower than lowThreshold');
    }

    if (policy.highThreshold < policy.medThreshold) {
      errors.push('highThreshold cannot be lower than medThreshold');
    }

    let totalWeight = policy.masterWeight;
    for (const signer of policy.signers) {
      if (!/^G[A-Z2-7]{55}$/.test(signer.publicKey)) {
        errors.push(`Invalid signer publicKey: ${signer.publicKey}`);
      }
      if (signer.weight <= 0) {
        errors.push(`Signer weight must be positive: ${signer.publicKey}`);
      }
      totalWeight += signer.weight;
    }

    if (totalWeight < policy.highThreshold) {
      errors.push(
        `Total combined signer weight (${totalWeight}) is less than highThreshold (${policy.highThreshold}), locking the account!`,
      );
    }

    return {
      valid: errors.length === 0,
      errors,
      totalWeight,
    };
  }

  /**
   * Returns recommended production 2-of-3 threshold policy for the Qyou distribution account.
   */
  public static createProductionPolicy(
    distributionAccount: string,
    signers: readonly [string, string],
  ): MultiSigThresholdPolicy {
    return {
      accountId: distributionAccount,
      masterWeight: 1, // Primary automated backend worker (weight 1)
      lowThreshold: 1,
      medThreshold: 2, // Distributions require 2 signatures (automated worker + security sidecar)
      highThreshold: 3, // Signer configuration changes require all 3 keys (including cold storage)
      signers: [
        { publicKey: signers[0], weight: 1 }, // Security Sidecar signer
        { publicKey: signers[1], weight: 1 }, // Cold Recovery signer
      ],
    };
  }
}
