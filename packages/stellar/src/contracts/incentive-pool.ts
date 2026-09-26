/**
 * Soroban IncentivePool Contract Types & Simulator
 *
 * Provides typed domain models, error classes, and an in-memory execution harness
 * for the Qyou IncentivePool Soroban contract.
 */

export class ContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContractError';
  }
}

export class ContractUnauthorizedError extends ContractError {
  constructor(message = 'Caller is not authorized to invoke this contract function') {
    super(message);
    this.name = 'ContractUnauthorizedError';
  }
}

export class ContractInsufficientBalanceError extends ContractError {
  constructor(message = 'Incentive pool has insufficient balance for distribution') {
    super(message);
    this.name = 'ContractInsufficientBalanceError';
  }
}

export class ContractAlreadyInitializedError extends ContractError {
  constructor(message = 'Incentive pool contract is already initialized') {
    super(message);
    this.name = 'ContractAlreadyInitializedError';
  }
}

export class ContractNotInitializedError extends ContractError {
  constructor(message = 'Incentive pool contract is not yet initialized') {
    super(message);
    this.name = 'ContractNotInitializedError';
  }
}

export class ContractInvalidAmountError extends ContractError {
  constructor(message = 'Amount must be a positive non-zero value') {
    super(message);
    this.name = 'ContractInvalidAmountError';
  }
}

export interface IncentivePoolConfig {
  readonly admin: string;
  readonly token: string;
  readonly upgradeAdmin: string;
}

export interface DepositParams {
  readonly from: string;
  readonly amount: bigint | number;
}

export interface DistributeParams {
  readonly caller: string;
  readonly recipient: string;
  readonly amount: bigint | number;
  readonly idempotencyKey: string;
}

export interface ContractEvent {
  readonly topic: 'deposit' | 'distribute' | 'upgrade';
  readonly data: Record<string, unknown>;
  readonly timestamp: number;
}

export class IncentivePoolContract {
  private _admin: string | null = null;
  private _token: string | null = null;
  private _upgradeAdmin: string | null = null;
  private _balance: bigint = 0n;
  private _wasmHash: string = 'initial_wasm_hash';
  private readonly _events: ContractEvent[] = [];
  private readonly _processedIdempotencyKeys = new Set<string>();

  public initialize(config: IncentivePoolConfig): void {
    if (this._admin !== null) {
      throw new ContractAlreadyInitializedError();
    }
    if (!config.admin || !config.token || !config.upgradeAdmin) {
      throw new ContractError('Admin, token, and upgradeAdmin addresses are required');
    }

    this._admin = config.admin;
    this._token = config.token;
    this._upgradeAdmin = config.upgradeAdmin;
    this._balance = 0n;
  }

  public deposit(params: DepositParams): bigint {
    this.assertInitialized();
    const amount = BigInt(params.amount);
    if (amount <= 0n) {
      throw new ContractInvalidAmountError();
    }
    if (!params.from) {
      throw new ContractUnauthorizedError('Depositor address required');
    }

    this._balance += amount;
    this._events.push({
      topic: 'deposit',
      data: {
        from: params.from,
        amount: amount.toString(),
      },
      timestamp: Date.now(),
    });

    return this._balance;
  }

  public distribute(params: DistributeParams): bigint {
    this.assertInitialized();
    const amount = BigInt(params.amount);
    if (amount <= 0n) {
      throw new ContractInvalidAmountError();
    }

    // Access control: only designated backend admin key can distribute
    if (params.caller !== this._admin) {
      throw new ContractUnauthorizedError('Only designated backend admin key can distribute rewards');
    }

    // Check balance
    if (this._balance < amount) {
      throw new ContractInsufficientBalanceError();
    }

    // Idempotency verification
    if (this._processedIdempotencyKeys.has(params.idempotencyKey)) {
      return this._balance; // Idempotent return without duplicate deduction
    }

    this._balance -= amount;
    this._processedIdempotencyKeys.add(params.idempotencyKey);

    this._events.push({
      topic: 'distribute',
      data: {
        recipient: params.recipient,
        amount: amount.toString(),
        idempotencyKey: params.idempotencyKey,
      },
      timestamp: Date.now(),
    });

    return this._balance;
  }

  public getBalance(): bigint {
    this.assertInitialized();
    return this._balance;
  }

  public getAdmin(): string {
    this.assertInitialized();
    return this._admin!;
  }

  public getUpgradeAdmin(): string {
    this.assertInitialized();
    return this._upgradeAdmin!;
  }

  public getWasmHash(): string {
    return this._wasmHash;
  }

  public getEvents(): readonly ContractEvent[] {
    return this._events;
  }

  public upgrade(caller: string, newWasmHash: string): void {
    this.assertInitialized();
    if (caller !== this._upgradeAdmin) {
      throw new ContractUnauthorizedError('Only upgradeAdmin is authorized to upgrade the contract');
    }
    if (!newWasmHash || newWasmHash.trim().length === 0) {
      throw new ContractError('New WASM bytecode hash must be provided');
    }

    this._wasmHash = newWasmHash;
    this._events.push({
      topic: 'upgrade',
      data: {
        upgradeAdmin: caller,
        newWasmHash,
      },
      timestamp: Date.now(),
    });
  }

  private assertInitialized(): void {
    if (this._admin === null) {
      throw new ContractNotInitializedError();
    }
  }
}
