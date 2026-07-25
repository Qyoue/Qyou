export type SessionSyncEventType = 'login' | 'logout' | 'token_refreshed';

export interface SessionSyncMessage {
  event: SessionSyncEventType;
  timestamp: number;
  userId?: string;
  tabId: string;
}

export interface WebAuthBoundaryState {
  isSyncedAcrossTabs: boolean;
  activeTabsCount: number;
  lastEvent?: SessionSyncMessage;
}
