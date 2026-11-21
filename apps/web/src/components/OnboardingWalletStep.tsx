'use client';

import React, { useState } from 'react';
import { WalletSetup } from './WalletSetup';

interface OnboardingWalletStepProps {
  onComplete?: () => void;
  onSkip?: () => void;
  redirectUrl?: string;
}

export function OnboardingWalletStep({
  onComplete,
  onSkip,
  redirectUrl = '/queue',
}: OnboardingWalletStepProps) {
  const [skipped, setSkipped] = useState(false);

  const handleSkip = () => {
    setSkipped(true);
    if (onSkip) {
      onSkip();
    } else if (typeof window !== 'undefined') {
      window.location.href = redirectUrl;
    }
  };

  const handleSuccess = () => {
    if (onComplete) {
      onComplete();
    } else if (typeof window !== 'undefined') {
      window.location.href = redirectUrl;
    }
  };

  if (skipped) {
    return (
      <div
        data-testid="onboarding-skipped"
        style={{
          padding: '24px',
          textAlign: 'center',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
        }}
      >
        <p style={{ color: '#4b5563', fontSize: '14px' }}>
          Redirecting you to the queues... (You can link a wallet anytime from Settings)
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="onboarding-wallet-step"
      style={{
        maxWidth: '560px',
        margin: '0 auto',
        padding: '28px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <span
          style={{
            display: 'inline-block',
            padding: '4px 12px',
            backgroundColor: '#eff6ff',
            color: '#1d4ed8',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '8px',
          }}
        >
          Optional Step
        </span>
        <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 8px 0', color: '#111827' }}>
          Earn Rewards While You Wait
        </h2>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '14px', lineHeight: 1.5 }}>
          Qyou distributes cryptographic rewards on the Stellar network for queue participation.
          Connect your wallet now or skip to start using queues immediately.
        </p>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <WalletSetup onSuccess={handleSuccess} />
      </div>

      <div style={{ textAlign: 'center', paddingTop: '12px', borderTop: '1px solid #f3f4f6' }}>
        <button
          type="button"
          onClick={handleSkip}
          data-testid="skip-onboarding-button"
          style={{
            background: 'none',
            border: 'none',
            color: '#6b7280',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '8px 16px',
            borderRadius: '6px',
            textDecoration: 'underline',
          }}
        >
          Skip for now, take me to queues →
        </button>
      </div>
    </div>
  );
}
