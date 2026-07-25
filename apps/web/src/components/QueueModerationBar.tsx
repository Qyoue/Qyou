import React from 'react';
import type { ModerationAction } from '@qyou/shared';

interface QueueModerationBarProps {
  queueId: string;
  isPaused?: boolean;
  onAction?: (action: ModerationAction) => void;
}

export function QueueModerationBar({ isPaused = false, onAction }: QueueModerationBarProps) {
  return (
    <div style={{ display: 'flex', gap: '8px', padding: '8px 12px', background: '#fff7ed', borderRadius: '6px' }}>
      <button
        onClick={() => onAction?.(isPaused ? 'resume' : 'pause')}
        style={{ padding: '6px 12px', background: isPaused ? '#16a34a' : '#ea580c', color: '#fff', border: 'none', borderRadius: '4px' }}
      >
        {isPaused ? 'Resume Queue' : 'Pause Queue'}
      </button>
      <button
        onClick={() => onAction?.('flag')}
        style={{ padding: '6px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px' }}
      >
        Report Issue
      </button>
    </div>
  );
}
