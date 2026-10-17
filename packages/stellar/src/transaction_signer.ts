/**
 * Transaction signing helper and payment-transaction builder for Qyou incentive distribution.
 */

export interface PaymentTransactionSpec {
  sourceAccount: string;
  destinationAccount: string;
  amount: string;
  assetCode: string;
  memo?: string;
}

export class PaymentTransactionBuilder {
  public static buildPaymentXdr(spec: PaymentTransactionSpec): string {
    // Construct mock raw XDR for payment transaction
    return `AAAAA_${spec.sourceAccount}_${spec.destinationAccount}_${spec.amount}_${spec.assetCode}`;
  }
}

export class TransactionSigner {
  public static signTransactionXdr(rawXdr: string, secretKey: string): string {
    if (!secretKey || secretKey.length < 10) {
      throw new Error('Invalid secret key for transaction signing');
    }
    return `SIGNED_${rawXdr}_${secretKey.substring(0, 4)}`;
  }
}
