import {
  IncentivePoolContract,
  IncentivePoolConfig,
  ContractEvent,
  ContractError,
  ContractUnauthorizedError,
  ContractInsufficientBalanceError,
} from './incentive-pool.js';

export interface IncentivePoolClientConfig {
  readonly contractId: string;
  readonly networkPassphrase?: string;
  readonly rpcUrl?: string;
  readonly adminSignerKey?: string;
  readonly contractInstance?: IncentivePoolContract;
}

export interface DistributionResult {
  readonly success: boolean;
  readonly txHash: string;
  readonly newBalance: bigint;
  readonly recipient: string;
  readonly amount: bigint;
  readonly idempotencyKey: string;
  readonly timestamp: number;
}

export interface DepositResult {
  readonly success: boolean;
  readonly txHash: string;
  readonly newBalance: bigint;
  readonly from: string;
  readonly amount: bigint;
}

/**
 * Node/TypeScript client for interacting with the Qyou IncentivePool Soroban contract.
 *
 * Provides high-level methods for depositing pool funds, distributing participant rewards,
 * checking balances, and querying event histories.
 */
export class IncentivePoolClient {
  public readonly contractId: string;
  public readonly networkPassphrase: string;
  public readonly rpcUrl: string;
  private readonly _adminSignerKey?: string;
  private readonly _contract: IncentivePoolContract;

  constructor(config: IncentivePoolClientConfig) {
    if (!config.contractId || config.contractId.trim().length === 0) {
      throw new ContractError('contractId is required to instantiate IncentivePoolClient');
    }

    this.contractId = config.contractId;
    this.networkPassphrase = config.networkPassphrase || 'Test SDF Network ; September 2015';
    this.rpcUrl = config.rpcUrl || 'https://soroban-testnet.stellar.org';
    this._adminSignerKey = config.adminSignerKey;

    // Use injected contract instance or initialize an internal simulator
    this._contract = config.contractInstance || new IncentivePoolContract();
  }

  /**
   * Initializes the contract instance if not already initialized.
   */
  public async initialize(config: IncentivePoolConfig): Promise<void> {
    this._contract.initialize(config);
  }

  /**
   * Deposits funds into the contract pool.
   */
  public async deposit(params: { from: string; amount: bigint | number }): Promise<DepositResult> {
    const newBalance = this._contract.deposit({
      from: params.from,
      amount: params.amount,
    });

    const txHash = this.generateSimulatedTxHash('deposit', params.from);

    return {
      success: true,
      txHash,
      newBalance,
      from: params.from,
      amount: BigInt(params.amount),
    };
  }

  /**
   * Distributes a queue participant reward payout.
   * Enforces backend admin signing and authorization.
   */
  public async distribute(params: {
    recipient: string;
    amount: bigint | number;
    idempotencyKey: string;
    caller?: string;
  }): Promise<DistributionResult> {
    const caller = params.caller || this._adminSignerKey;
    if (!caller) {
      throw new ContractUnauthorizedError('Admin caller address or adminSignerKey must be provided');
    }

    const newBalance = this._contract.distribute({
      caller,
      recipient: params.recipient,
      amount: params.amount,
      idempotencyKey: params.idempotencyKey,
    });

    const txHash = this.generateSimulatedTxHash('distrib', params.idempotencyKey);

    return {
      success: true,
      txHash,
      newBalance,
      recipient: params.recipient,
      amount: BigInt(params.amount),
      idempotencyKey: params.idempotencyKey,
      timestamp: Date.now(),
    };
  }

  /**
   * Returns current balance held by the pool.
   */
  public async getBalance(): Promise<bigint> {
    return this._contract.getBalance();
  }

  /**
   * Returns authorized admin address.
   */
  public async getAdmin(): Promise<string> {
    return this._contract.getAdmin();
  }

  /**
   * Returns all events emitted by the contract instance.
   */
  public async getEvents(): Promise<readonly ContractEvent[]> {
    return this._contract.getEvents();
  }

  /**
   * Upgrades the contract bytecode hash.
   */
  public async upgrade(caller: string, newWasmHash: string): Promise<{ txHash: string }> {
    this._contract.upgrade(caller, newWasmHash);
    const txHash = this.generateSimulatedTxHash('upgrade', newWasmHash);
    return { txHash };
  }

  private generateSimulatedTxHash(prefix: string, seed: string): string {
    const raw = `${prefix}-${this.contractId}-${seed}-${Date.now()}`;
    return Buffer.from(raw).toString('hex').slice(0, 64);
  }
}
