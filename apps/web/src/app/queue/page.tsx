'use client';

import { useState } from 'react';
import type { QueueCategory } from '@qyou/shared';
import { QueueFilterBar } from '../../components/QueueFilterBar';
import { QueueModerationBar } from '../../components/QueueModerationBar';
import { QueueMembershipBadge } from '../../components/QueueMembershipBadge';
import { RealTimeWaitTimeCard } from '../../components/RealTimeWaitTimeCard';

// TODO(#833): wire to queue-api-contract-client once backend queue API ships.
// Currently renders with placeholder/demo data.

export default function QueuePage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<QueueCategory | undefined>(undefined);

  return (
    <main style={{ maxWidth: '640px', margin: '2rem auto', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Queue</h1>

      <QueueFilterBar
        onSearchChange={setSearch}
        onCategoryChange={setCategory}
      />

      <RealTimeWaitTimeCard
        averageWaitMinutes={12}
        reportsCount={8}
        confidenceScore={75}
      />

      <QueueMembershipBadge positionNumber={3} role="member" />

      <QueueModerationBar
        queueId="demo"
        isPaused={false}
        onAction={(action) => console.log('Moderation action:', action)}
      />

      {/* Debug: show active filters */}
      {(search || category) && (
        <p style={{ fontSize: '0.8125rem', color: '#666' }}>
          Filtering by: {[search && `"${search}"`, category].filter(Boolean).join(', ')}
        </p>
      )}
    </main>
  );
}
