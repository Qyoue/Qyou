import React from 'react';

interface AccountSafetyVerificationBadgeProps {
  isVerified?: boolean;
  pendingEmail?: string;
}

export function AccountSafetyVerificationBadge({
  isVerified = true,
  pendingEmail,
}: AccountSafetyVerificationBadgeProps) {
  if (!isVerified && pendingEmail) {
    return (
      <div style={{ background: '#fef3c7', color: '#b45309', padding: '6px 10px', borderRadius: '4px', fontSize: '12px' }}>
        Pending email verification sent to <strong>{pendingEmail}</strong>.
      </div>
    );
  }

  return (
    <div style={{ background: '#f0fdf4', color: '#15803d', padding: '6px 10px', borderRadius: '4px', fontSize: '12px' }}>
      ✓ Account security verified
    </div>
  );
}
