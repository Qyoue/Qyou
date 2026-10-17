/**
 * Runtime-Toggleable Distribution Kill Switch (#1030)
 *
 * Provides an immediate operational lever to halt all outgoing Stellar distributions
 * without requiring a redeployment or service restart.
 */

export interface KillSwitchState {
  readonly halted: boolean;
  readonly reason?: string;
  readonly haltedAt?: number;
  readonly haltedBy?: string;
  readonly resumedAt?: number;
  readonly resumedBy?: string;
}

export interface KillSwitchStorage {
  get(): Promise<KillSwitchState> | KillSwitchState;
  set(state: KillSwitchState): Promise<void> | void;
}

export class InMemoryKillSwitchStorage implements KillSwitchStorage {
  private _state: KillSwitchState = { halted: false };

  public get(): KillSwitchState {
    return { ...this._state };
  }

  public set(state: KillSwitchState): void {
    this._state = { ...state };
  }
}

export class KillSwitchActiveError extends Error {
  public readonly killSwitchState: KillSwitchState;

  constructor(state: KillSwitchState) {
    const reasonText = state.reason ? `: ${state.reason}` : '';
    const haltedByText = state.haltedBy ? ` by ${state.haltedBy}` : '';
    const timestampText = state.haltedAt ? ` at ${new Date(state.haltedAt).toISOString()}` : '';
    super(`Stellar distributions are halted by emergency kill switch${reasonText} (activated${haltedByText}${timestampText})`);
    this.name = 'KillSwitchActiveError';
    this.killSwitchState = state;
  }
}

export type KillSwitchListener = (state: KillSwitchState) => void;

export class DistributionKillSwitch {
  private static _instance: DistributionKillSwitch | null = null;
  private readonly _storage: KillSwitchStorage;
  private _cachedState: KillSwitchState = { halted: false };
  private readonly _listeners = new Set<KillSwitchListener>();

  constructor(storage?: KillSwitchStorage) {
    this._storage = storage || new InMemoryKillSwitchStorage();
    const initial = this._storage.get();
    if (initial instanceof Promise) {
      initial.then((s) => {
        this._cachedState = s;
      });
    } else {
      this._cachedState = initial;
    }
  }

  public static getInstance(): DistributionKillSwitch {
    if (!DistributionKillSwitch._instance) {
      DistributionKillSwitch._instance = new DistributionKillSwitch();
    }
    return DistributionKillSwitch._instance;
  }

  public static resetInstance(): void {
    DistributionKillSwitch._instance = null;
  }

  /**
   * Halts all outgoing distributions immediately.
   */
  public async halt(reason: string, haltedBy = 'operator'): Promise<KillSwitchState> {
    const newState: KillSwitchState = {
      halted: true,
      reason,
      haltedAt: Date.now(),
      haltedBy,
    };
    await this._storage.set(newState);
    this._cachedState = newState;
    this._notify(newState);
    return newState;
  }

  /**
   * Synchronously halts distributions using in-memory state.
   */
  public haltSync(reason: string, haltedBy = 'operator'): KillSwitchState {
    const newState: KillSwitchState = {
      halted: true,
      reason,
      haltedAt: Date.now(),
      haltedBy,
    };
    this._storage.set(newState);
    this._cachedState = newState;
    this._notify(newState);
    return newState;
  }

  /**
   * Resumes distributions.
   */
  public async resume(resumedBy = 'operator'): Promise<KillSwitchState> {
    const newState: KillSwitchState = {
      halted: false,
      resumedAt: Date.now(),
      resumedBy,
    };
    await this._storage.set(newState);
    this._cachedState = newState;
    this._notify(newState);
    return newState;
  }

  /**
   * Synchronously resumes distributions.
   */
  public resumeSync(resumedBy = 'operator'): KillSwitchState {
    const newState: KillSwitchState = {
      halted: false,
      resumedAt: Date.now(),
      resumedBy,
    };
    this._storage.set(newState);
    this._cachedState = newState;
    this._notify(newState);
    return newState;
  }

  /**
   * Returns whether the kill switch is currently active (halted).
   */
  public isHalted(): boolean {
    return this._cachedState.halted;
  }

  /**
   * Returns the current state of the kill switch.
   */
  public getState(): KillSwitchState {
    return { ...this._cachedState };
  }

  /**
   * Asynchronously refreshes state from the underlying storage.
   */
  public async refresh(): Promise<KillSwitchState> {
    const state = await this._storage.get();
    this._cachedState = state;
    return { ...this._cachedState };
  }

  /**
   * Asserts that distributions are allowed. Throws KillSwitchActiveError if halted.
   */
  public assertNotHalted(): void {
    if (this._cachedState.halted) {
      throw new KillSwitchActiveError(this._cachedState);
    }
  }

  /**
   * Subscribes to kill switch state transitions.
   */
  public subscribe(listener: KillSwitchListener): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  private _notify(state: KillSwitchState): void {
    for (const listener of this._listeners) {
      try {
        listener(state);
      } catch {
        // Prevent listener errors from interrupting kill switch operation
      }
    }
  }
}
