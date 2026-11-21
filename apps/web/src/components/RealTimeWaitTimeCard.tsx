// #823: This component is named "RealTime" but currently uses polled/static
// props. A real-time transport (SSE or WebSocket) is not yet implemented.
// TODO: wire to a GET /api/queue/:id/stream SSE endpoint once the queue API ships.
import React from 'react';

interface RealTimeWaitTimeCardProps {
  averageWaitMinutes?: number;
  reportsCount?: number;
  confidenceScore?: number;
}

export function RealTimeWaitTimeCard({
  averageWaitMinutes = 15,
  reportsCount = 5,
  confidenceScore = 80,
}: RealTimeWaitTimeCardProps) {
  return (
    <div style={{ padding: '12px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px' }}>
      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#166534' }}>
        ⏱️ ~{averageWaitMinutes} mins wait time
      </div>
      <div style={{ fontSize: '12px', color: '#15803d', marginTop: '4px' }}>
        Based on {reportsCount} user report{reportsCount !== 1 ? 's' : ''} ({confidenceScore}% confidence)
      </div>
    </div>
  );
}
