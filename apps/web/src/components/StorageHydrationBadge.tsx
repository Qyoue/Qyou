import React from 'react';

// #840: dev/debug only — excluded from production builds
if (process.env.NODE_ENV === 'production') {
  throw new Error('StorageHydrationBadge must not be imported in production builds.');
}

interface StorageHydrationBadgeProps {
  status?: 'uninitialized' | 'hydrating' | 'hydrated' | 'error';
  hasSession?: boolean;
}

export function StorageHydrationBadge({
  status = 'hydrated',
  hasSession = false,
}: StorageHydrationBadgeProps) {
  const badgeColor = status === 'hydrated' ? '#16a34a' : status === 'error' ? '#dc2626' : '#d97706';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: badgeColor }}>
      <span style={{ fontWeight: 'bold' }}>●</span>
      <span>{status === 'hydrated' ? (hasSession ? 'Session Hydrated' : 'Ready') : status}</span>
    </div>
  );
}
