import React from 'react';
import type { QueueMemberRole } from '@qyou/shared';

interface QueueMembershipBadgeProps {
  positionNumber?: number;
  role?: QueueMemberRole;
}

export function QueueMembershipBadge({
  positionNumber = 1,
  role = 'member',
}: QueueMembershipBadgeProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: '#eff6ff', borderRadius: '6px' }}>
      <span style={{ fontWeight: 'bold', color: '#1d4ed8' }}>#{positionNumber} in queue</span>
      {role !== 'member' && (
        <span style={{ fontSize: '11px', padding: '2px 6px', background: '#dbeafe', color: '#1e40af', borderRadius: '4px' }}>
          {role.replace('_', ' ').toUpperCase()}
        </span>
      )}
    </div>
  );
}
