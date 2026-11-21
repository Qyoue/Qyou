import React from 'react';

interface AuthRolloutBannerProps {
  isCanaryUser?: boolean;
}

export function AuthRolloutBanner({ isCanaryUser = false }: AuthRolloutBannerProps) {
  if (!isCanaryUser) return null;

  return (
    <div style={{ background: '#ecfdf5', color: '#047857', padding: '6px 12px', fontSize: '12px' }}>
      ✨ You are using the new Phase 3 Web Auth Experience (Persistent session enabled).
    </div>
  );
}
