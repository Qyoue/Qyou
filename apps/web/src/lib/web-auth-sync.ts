import {
  sessionSyncMessageSchema,
  type SessionSyncMessage,
  type SessionSyncEventType,
} from '@qyou/shared';

const BROADCAST_CHANNEL_NAME = 'qyou_auth_sync_v3';

export function broadcastSessionEvent(event: SessionSyncEventType, userId?: string): void {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
    return;
  }

  const payload: SessionSyncMessage = {
    event,
    timestamp: Date.now(),
    userId,
    tabId: Math.random().toString(36).substring(2, 9),
  };

  const validation = sessionSyncMessageSchema.safeParse(payload);
  if (validation.success) {
    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    channel.postMessage(validation.data);
    channel.close();
  }
}
