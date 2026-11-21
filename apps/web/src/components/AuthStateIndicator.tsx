/**
 * AuthStateIndicator states:
 * 1. Authenticated: Shows green indicator dot and signed-in status.
 * 2. Unauthenticated: Shows red indicator dot and not signed in.
 */
export type AuthIndicatorState = "AUTHENTICATED" | "UNAUTHENTICATED";

import React from 'react';

interface AuthStateIndicatorProps {
  isAuthenticated: boolean;
  username?: string;
  storageType?: string;
}

export function AuthStateIndicator({
  isAuthenticated,
  username,
  storageType = 'localStorage',
}: AuthStateIndicatorProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isAuthenticated ? '#22c55e' : '#ef4444',
        }}
      />
      <span>{isAuthenticated ? `Signed in as ${username ?? 'User'} (${storageType})` : 'Not signed in'}</span>
    </div>
  );
}
