'use client';

import React from 'react';
import { WalletSetup } from '../../../components/WalletSetup';
import { WalletBalanceCard } from '../../../components/WalletBalanceCard';

export default function WalletSettingsPage() {
  return (
    <main
      style={{
        maxWidth: '720px',
        margin: '40px auto',
        padding: '0 16px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0' }}>
          Stellar Wallet Settings
        </h1>
        <p style={{ color: '#4b5563', fontSize: '14px', margin: 0 }}>
          Manage your Stellar account for earning rewards while waiting in queues.
        </p>
      </header>

      <section style={{ marginBottom: '32px' }}>
        <WalletBalanceCard />
      </section>

      <section>
        <WalletSetup />
      </section>
    </main>
  );
}
