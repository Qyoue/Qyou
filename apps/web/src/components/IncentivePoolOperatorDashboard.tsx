'use client';

import React, { useState } from 'react';
import { Button } from './Button';

export interface DistributionItem {
  id: string;
  queueId: string;
  recipient: string;
  amount: string;
  asset: string;
  status: 'confirmed' | 'pending' | 'failed';
  txHash?: string;
  error?: string;
  timestamp: number;
}

interface OperatorDashboardProps {
  initialBalance?: string;
  distributions?: DistributionItem[];
  contractId?: string;
  distributionAddress?: string;
}

export function IncentivePoolOperatorDashboard({
  initialBalance = '2450.0000000',
  contractId = 'C1234567890INCENTIVESERVICETEST',
  distributionAddress = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU',
  distributions: initialDistributions,
}: OperatorDashboardProps) {
  const [balance, setBalance] = useState(initialBalance);
  const [distributions, setDistributions] = useState<DistributionItem[]>(
    initialDistributions || [
      {
        id: 'dist-1',
        queueId: 'queue-main-gate',
        recipient: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU',
        amount: '5.0000000',
        asset: 'XLM',
        status: 'confirmed',
        txHash: '0x3a9b1c8f...2e14',
        timestamp: Date.now() - 120_000,
      },
      {
        id: 'dist-2',
        queueId: 'queue-fast-pass',
        recipient: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7',
        amount: '10.0000000',
        asset: 'XLM',
        status: 'confirmed',
        txHash: '0x7e4d8a1c...9f22',
        timestamp: Date.now() - 360_000,
      },
      {
        id: 'dist-3',
        queueId: 'queue-vip-lounge',
        recipient: 'GCXTAQ5QG3Z2YOMRLP2BGLF3J5O2U76X6U32V25W75L27YQ7H37K6Z5A',
        amount: '15.0000000',
        asset: 'XLM',
        status: 'failed',
        error: 'Network timeout during transaction simulation',
        timestamp: Date.now() - 600_000,
      },
    ],
  );

  const numericBalance = parseFloat(balance) || 0;
  const isLowBalance = numericBalance < 100;
  const failedDistributions = distributions.filter((d) => d.status === 'failed');

  const handleRetry = (distId: string) => {
    setDistributions((prev) =>
      prev.map((d) =>
        d.id === distId
          ? {
              ...d,
              status: 'confirmed',
              txHash: `0x${Math.random().toString(16).substring(2, 10)}...retry`,
              error: undefined,
            }
          : d,
      ),
    );
  };

  return (
    <div
      data-testid="operator-dashboard"
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        maxWidth: '1080px',
        margin: '0 auto',
        padding: '24px',
      }}
    >
      <header style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px 0' }}>
              Stellar Incentive Pool Operations
            </h1>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '14px' }}>
              Monitor pool liquidity, distribution transactions, and health alerts.
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: isLowBalance ? '#fef3c7' : '#d1fae5',
                color: isLowBalance ? '#92400e' : '#065f46',
              }}
            >
              {isLowBalance ? '⚠ Low Balance Warning' : '● Pool Healthy'}
            </span>
          </div>
        </div>
      </header>

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          data-testid="pool-balance-metric"
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '20px',
          }}
        >
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>
            Pool Available Balance
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#111827' }}>
            {balance} <span style={{ fontSize: '16px', color: '#6b7280' }}>XLM</span>
          </div>
          <div style={{ fontSize: '12px', color: '#059669', marginTop: '6px' }}>
            Contract: {contractId.slice(0, 10)}...
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '20px',
          }}
        >
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>
            Total Distributions
          </div>
          <div style={{ fontSize: '26px', fontWeight: 700, color: '#111827' }}>
            {distributions.filter((d) => d.status === 'confirmed').length}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
            Completed rewards on-chain
          </div>
        </div>

        <div
          data-testid="failed-transactions-metric"
          style={{
            backgroundColor: '#ffffff',
            border: failedDistributions.length > 0 ? '1px solid #fecaca' : '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '20px',
          }}
        >
          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>
            Failed Distributions
          </div>
          <div
            style={{
              fontSize: '26px',
              fontWeight: 700,
              color: failedDistributions.length > 0 ? '#dc2626' : '#111827',
            }}
          >
            {failedDistributions.length}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
            Requires operator attention
          </div>
        </div>
      </div>

      {/* Failed Transactions Alert Section */}
      {failedDistributions.length > 0 && (
        <section
          data-testid="failed-alerts-section"
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '24px',
          }}
        >
          <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#991b1b', fontWeight: 600 }}>
            🚨 Failed Transaction Alerts ({failedDistributions.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {failedDistributions.map((f) => (
              <div
                key={f.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                }}
              >
                <div>
                  <strong>Queue: {f.queueId}</strong> — {f.amount} {f.asset} to{' '}
                  <span style={{ fontFamily: 'monospace' }}>{f.recipient.slice(0, 10)}...</span>
                  <div style={{ color: '#dc2626', marginTop: '2px' }}>{f.error}</div>
                </div>
                <Button
                  onClick={() => handleRetry(f.id)}
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    fontSize: '12px',
                    padding: '6px 12px',
                  }}
                  data-testid={`retry-btn-${f.id}`}
                >
                  Retry Distribution
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Distributions Table */}
      <section
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '20px',
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>
          Recent Distributions
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e7eb', textAlign: 'left', color: '#6b7280' }}>
              <th style={{ padding: '8px 12px' }}>Queue ID</th>
              <th style={{ padding: '8px 12px' }}>Recipient</th>
              <th style={{ padding: '8px 12px' }}>Amount</th>
              <th style={{ padding: '8px 12px' }}>Status</th>
              <th style={{ padding: '8px 12px' }}>Tx Hash</th>
            </tr>
          </thead>
          <tbody>
            {distributions.map((d) => (
              <tr key={d.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px' }}>{d.queueId}</td>
                <td style={{ padding: '12px', fontFamily: 'monospace' }}>
                  {d.recipient.slice(0, 8)}...{d.recipient.slice(-6)}
                </td>
                <td style={{ padding: '12px', fontWeight: 600 }}>
                  {d.amount} {d.asset}
                </td>
                <td style={{ padding: '12px' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor:
                        d.status === 'confirmed'
                          ? '#d1fae5'
                          : d.status === 'pending'
                            ? '#fef3c7'
                            : '#fee2e2',
                      color:
                        d.status === 'confirmed'
                          ? '#065f46'
                          : d.status === 'pending'
                            ? '#92400e'
                            : '#991b1b',
                    }}
                  >
                    {d.status}
                  </span>
                </td>
                <td style={{ padding: '12px', fontFamily: 'monospace', color: '#6b7280' }}>
                  {d.txHash || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
