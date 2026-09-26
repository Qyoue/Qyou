'use client';

import React from 'react';
import { OnboardingWalletStep } from '../../../components/OnboardingWalletStep';

export default function OnboardingWalletPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <OnboardingWalletStep />
    </main>
  );
}
