import { Transaction, Server } from '@stellar/stellar-sdk';

export interface TransactionSubmitter {
  submit(tx: Transaction): Promise<{ hash: string; ledger: number }>;
}

export class HorizonSubmitter implements TransactionSubmitter {
  constructor(private server: Server) {}

  async submit(tx: Transaction): Promise<{ hash: string; ledger: number }> {
    const result = await this.server.submitTransaction(tx);
    return {
      hash: result.hash,
      ledger: result.ledger,
    };
  }
}

export class MockSubmitter implements TransactionSubmitter {
  public submitted: Transaction[] = [];
  private shouldFail: boolean;

  constructor(shouldFail = false) {
    this.shouldFail = shouldFail;
  }

  async submit(tx: Transaction): Promise<{ hash: string; ledger: number }> {
    if (this.shouldFail) {
      throw new Error('Mock submission failure: transaction rejected');
    }
    this.submitted.push(tx);
    return { hash: 'mock-hash-' + Date.now(), ledger: 999 };
  }

  reset() {
    this.submitted = [];
  }
}

export class TransactionService {
  constructor(private submitter: TransactionSubmitter) {}

  async send(tx: Transaction): Promise<{ hash: string; ledger: number }> {
    try {
      return await this.submitter.submit(tx);
    } catch (err: any) {
      throw new Error(`Transaction failed: ${err.message}`);
    }
  }
}
