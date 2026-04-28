import {
  TransactionBuilder,
  Asset,
  Operation,
  Memo,
  Networks,
} from '@stellar/stellar-sdk';
import { server, STELLAR_CONFIG } from './index';

export class TransactionHelper {
  static async buildPaymentTx(
    senderPublicKey: string,
    receiverPublicKey: string,
    amount: string,
    memoText?: string,
  ) {
    const account = await server.loadAccount(senderPublicKey);
    const networkPassphrase =
      STELLAR_CONFIG.network === 'MAINNET' ? Networks.PUBLIC : Networks.TESTNET;

    const builder = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase,
    }).addOperation(
      Operation.payment({
        destination: receiverPublicKey,
        asset: Asset.native(),
        amount: amount,
      }),
    );

    if (memoText) {
      builder.addMemo(Memo.text(memoText));
    }

    return builder.setTimeout(30).build();
  }

  static async submitTx(transaction: any) {
    try {
      console.log('   🚀 Submitting transaction to network...');
      const response = await server.submitTransaction(transaction);
      console.log(`   ✅ Success! Hash: ${response.hash}`);
      return response;
    } catch (e: any) {
      const errors = e.response?.data?.extras?.result_codes;
      console.error('   ❌ Submission Failed:', errors || e.message);
      throw e;
    }
  }
}
