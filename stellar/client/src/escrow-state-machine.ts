export type EscrowState =
  | 'CREATED'
  | 'FUNDED'
  | 'BUDDY_ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DISPUTED'
  | 'RELEASED'
  | 'REFUNDED'
  | 'EXPIRED';

export interface EscrowTransition {
  from: EscrowState;
  to: EscrowState;
  trigger: string;
}

export const ESCROW_TRANSITIONS: EscrowTransition[] = [
  { from: 'CREATED',        to: 'FUNDED',         trigger: 'requester_deposits_xlm' },
  { from: 'FUNDED',         to: 'BUDDY_ACCEPTED',  trigger: 'buddy_accepts_task' },
  { from: 'BUDDY_ACCEPTED', to: 'IN_PROGRESS',     trigger: 'buddy_checks_in' },
  { from: 'IN_PROGRESS',    to: 'COMPLETED',       trigger: 'requester_confirms' },
  { from: 'COMPLETED',      to: 'RELEASED',        trigger: 'payout_settled' },
  { from: 'IN_PROGRESS',    to: 'DISPUTED',        trigger: 'dispute_raised' },
  { from: 'DISPUTED',       to: 'RELEASED',        trigger: 'dispute_resolved_buddy' },
  { from: 'DISPUTED',       to: 'REFUNDED',        trigger: 'dispute_resolved_requester' },
  { from: 'FUNDED',         to: 'EXPIRED',         trigger: 'ttl_elapsed' },
  { from: 'BUDDY_ACCEPTED', to: 'EXPIRED',         trigger: 'ttl_elapsed' },
  { from: 'EXPIRED',        to: 'REFUNDED',        trigger: 'auto_refund_triggered' },
];

export interface EscrowRecord {
  id: string;
  buddyRequestId: string;
  requesterId: string;
  buddyId?: string;
  amountXlm: string;
  state: EscrowState;
  stellarTxHash?: string;
  createdAt: string;
  expiresAt: string;
  updatedAt: string;
}

export function canTransition(current: EscrowState, trigger: string): EscrowState | null {
  const match = ESCROW_TRANSITIONS.find(t => t.from === current && t.trigger === trigger);
  return match ? match.to : null;
}
