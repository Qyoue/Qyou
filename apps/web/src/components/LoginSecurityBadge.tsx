import React from 'react';

interface LoginSecurityBadgeProps {
  riskScore?: number;
  isKnownDevice?: boolean;
}

export function LoginSecurityBadge({
  riskScore = 10,
  isKnownDevice = true,
}: LoginSecurityBadgeProps) {
  const isHighRisk = riskScore > 40;
  const label = isHighRisk ? 'Unrecognized device (Verification required)' : 'Recognized device';
  const color = isHighRisk ? '#ea580c' : '#16a34a';

  return (
    <div style={{ padding: '6px 10px', fontSize: '12px', color, border: `1px solid ${color}`, borderRadius: '4px' }}>
      {label}
    </div>
  );
}
