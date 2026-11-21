/**
 * Transaction signing helper and payment-transaction builder for Qyou incentive distribution.
 */
import { Account, Asset, BASE_FEE, Keypair, Memo, Networks, Operation, TransactionBuilder } from '@stellar/stellar-sdk';

export interface PaymentTransactionSpec {
  sourceAccount: string;
  destinationAccount: string;
  amount: string;
  assetCode: string;
  issuer?: string;
  memo?: string;
  sequence?: string;
  fee?: string;
  timeoutSeconds?: number;
  networkPassphrase?: string;
}

export class PaymentTransactionBuilder {
  public static buildPaymentXdr(spec: PaymentTransactionSpec): string {
    const asset = spec.assetCode === 'XLM' && !spec.issuer ? Asset.native() : new Asset(spec.assetCode, spec.issuer);
    const builder = new TransactionBuilder(new Account(spec.sourceAccount, spec.sequence ?? '0'), {
      fee: spec.fee ?? BASE_FEE,
      networkPassphrase: spec.networkPassphrase ?? Networks.TESTNET,
    })
      .addOperation(Operation.payment({ destination: spec.destinationAccount, asset, amount: spec.amount }))
      .setTimeout(spec.timeoutSeconds ?? 300);
    if (spec.memo) builder.addMemo(Memo.text(spec.memo));
    return builder.build().toXDR();
  }
}

export class TransactionSigner {
  public static signTransactionXdr(rawXdr: string, secretKey: string, networkPassphrase: string = Networks.TESTNET): string {
    let keypair: Keypair;
    try {
      keypair = Keypair.fromSecret(secretKey);
    } catch {
      throw new Error('Invalid secret key for transaction signing');
    }
    const tx = TransactionBuilder.fromXDR(rawXdr, networkPassphrase);
    tx.sign(keypair);
    return tx.toXDR();
  }
}
