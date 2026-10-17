import React from 'react';

interface WebAuthBoundaryNoticeProps {
  synced?: boolean;
  tabCount?: number;
}

export function WebAuthBoundaryNotice({
  synced = true,
  tabCount = 1,
}: WebAuthBoundaryNoticeProps) {
  return (
    <div style={{ padding: '8px 12px', background: '#f3f4f6', borderRadius: '4px', fontSize: '13px' }}>
      <span>Session status: {synced ? 'Synchronized across tabs' : 'Tab isolated'} ({tabCount} active tab{tabCount > 1 ? 's' : ''})</span>
    </div>
  );
}
