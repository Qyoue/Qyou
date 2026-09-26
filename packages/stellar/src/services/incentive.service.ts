import { IncentivePoolClient } from '../contracts/client.js';

export interface IncentiveServiceOptions {
  readonly client?: IncentivePoolClient;
  readonly contractId?: string;
  readonly adminSignerKey?: string;
}

export class IncentiveService {
  private readonly _client: IncentivePoolClient;

  constructor(options: IncentiveServiceOptions = {}) {
    this._client =
      options.client ||
      new IncentivePoolClient({
        contractId:
          options.contractId ||
          process.env.STELLAR_INCENTIVE_POOL_CONTRACT_ID ||
          'CDEFAULTTESTNETCONTRACTID1234567890',
        adminSignerKey: options.adminSignerKey || process.env.STELLAR_DISTRIBUTION_SECRET_KEY,
      });
  }

  public getClient(): IncentivePoolClient {
    return this._client;
  }

  public async rewardParticipant(params: {
    recipient: string;
    amount: bigint | number;
    idempotencyKey: string;
  }) {
    return this._client.distribute(params);
  }

  public async getPoolBalance(): Promise<bigint> {
    return this._client.getBalance();
  }
}
