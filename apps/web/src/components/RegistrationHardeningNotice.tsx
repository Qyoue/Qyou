import React from 'react';

interface RegistrationHardeningNoticeProps {
  cooldownSeconds?: number;
  showComplexityMeter?: boolean;
}

export function RegistrationHardeningNotice({
  cooldownSeconds = 0,
  showComplexityMeter = false,
}: RegistrationHardeningNoticeProps) {
  if (cooldownSeconds > 0) {
    return (
      <div style={{ color: '#dc2626', padding: '8px 12px', background: '#fee2e2', borderRadius: '4px' }}>
        Too many attempts. Please wait {cooldownSeconds} seconds before trying again.
      </div>
    );
  }

  if (showComplexityMeter) {
    return (
      <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '4px' }}>
        Password requirements: Minimum 10 characters, 1 uppercase, 1 number, and 1 special symbol.
      </div>
    );
  }

  return null;
}
