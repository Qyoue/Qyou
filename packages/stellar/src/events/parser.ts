export interface ParsedDistributionEvent {
  readonly topic: 'distribute';
  readonly recipient: string;
  readonly amount: bigint;
  readonly idempotencyKey: string;
  readonly timestamp: number;
}

export interface ParsedDepositEvent {
  readonly topic: 'deposit';
  readonly from: string;
  readonly amount: bigint;
  readonly timestamp: number;
}

export interface ParsedUpgradeEvent {
  readonly topic: 'upgrade';
  readonly upgradeAdmin: string;
  readonly newWasmHash: string;
  readonly timestamp: number;
}

export type ParsedContractEvent =
  | ParsedDistributionEvent
  | ParsedDepositEvent
  | ParsedUpgradeEvent;

/**
 * Parses raw Soroban or simulated contract events into strongly-typed domain events.
 */
export function parseContractEvent(event: any): ParsedContractEvent | null {
  if (!event || typeof event !== 'object') {
    return null;
  }

  const topic = event.topic || (Array.isArray(event.topics) ? event.topics[0] : null);

  if (topic === 'distribute' || topic === 'distrib') {
    const data = event.data || {};
    return {
      topic: 'distribute',
      recipient: data.recipient || event.recipient || '',
      amount: BigInt(data.amount || event.amount || 0),
      idempotencyKey: data.idempotencyKey || event.idempotencyKey || '',
      timestamp: event.timestamp || Date.now(),
    };
  }

  if (topic === 'deposit') {
    const data = event.data || {};
    return {
      topic: 'deposit',
      from: data.from || event.from || '',
      amount: BigInt(data.amount || event.amount || 0),
      timestamp: event.timestamp || Date.now(),
    };
  }

  if (topic === 'upgrade') {
    const data = event.data || {};
    return {
      topic: 'upgrade',
      upgradeAdmin: data.upgradeAdmin || event.upgradeAdmin || '',
      newWasmHash: data.newWasmHash || event.newWasmHash || '',
      timestamp: event.timestamp || Date.now(),
    };
  }

  return null;
}
