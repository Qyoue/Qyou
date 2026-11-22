export type ModerationAction =
  | 'pause'
  | 'resume'
  | 'flag'
  | 'unflag'
  | 'update_capacity'
  | 'remove_member'
  | 'close_queue'
  | 'mute';

export interface QueueModerationRecord {
  queueId: string;
  operatorId: string;
  action: ModerationAction;
  reason?: string;
  timestamp: string;
}

export interface OperatorPermissions {
  operatorId: string;
  assignedQueueIds: string[];
  canModerate: boolean;
}
