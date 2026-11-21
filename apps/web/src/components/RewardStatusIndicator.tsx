'use client';

import React from 'react';

export type RewardIndicatorStatus = 'idle' | 'pending' | 'confirmed' | 'failed';

interface RewardStatusIndicatorProps {
  status: RewardIndicatorStatus;
  amount?: string;
  asset?: string;
  txHash?: string;
  errorMessage?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function RewardStatusIndicator({
  status,
  amount = '5.0000000',
  asset = 'XLM',
  txHash,
  errorMessage,
  onRetry,
  onDismiss,
}: RewardStatusIndicatorProps) {
  if (status === 'idle') {
    return null;
  }

  const truncateTx = (hash: string) => {
    if (!hash || hash.length < 12) return hash;
    return `${hash.slice(0, 6)}...${hash.slice(-6)}`;
  };

  return (
    <div
      data-testid={`reward-status-${status}`}
      style={{
        borderRadius: '8px',
        padding: '14px 18px',
        margin: '16px 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '14px',
        border:
          status === 'pending'
            ? '1px solid #fde68a'
            : status === 'confirmed'
              ? '1px solid #a7f3d0'
              : '1px solid #fecaca',
        backgroundColor:
          status === 'pending'
            ? '#fffbeb'
            : status === 'confirmed'
              ? '#ecfdf5'
              : '#fef2f2',
        color:
          status === 'pending'
            ? '#92400e'
            : status === 'confirmed'
              ? '#065f46'
              : '#991b1b',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {status === 'pending' && (
          <span
            style={{
              display: 'inline-block',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#f59e0b',
              animation: 'pulse 1.5s infinite',
            }}
          />
        )}
        {status === 'confirmed' && (
          <span style={{ fontSize: '16px', fontWeight: 700 }}>✓</span>
        )}
        {status === 'failed' && (
          <span style={{ fontSize: '16px', fontWeight: 700 }}>⚠</span>
        )}

        <div>
          {status === 'pending' && (
            <div>
              <strong>Reward Distribution Pending</strong>
              <div style={{ fontSize: '12px', color: '#b45309', marginTop: '2px' }}>
                Confirming {amount} {asset} payout on the Stellar network...
              </div>
            </div>
          )}

          {status === 'confirmed' && (
            <div>
              <strong>Reward Confirmed!</strong>
              <div style={{ fontSize: '12px', color: '#047857', marginTop: '2px' }}>
                +{amount} {asset} received in your linked Stellar wallet.
                {txHash && (
                  <span style={{ marginLeft: '6px', fontFamily: 'monospace' }}>
                    (tx: {truncateTx(txHash)})
                  </span>
                )}
              </div>
            </div>
          )}

          {status === 'failed' && (
            <div>
              <strong>Reward Distribution Delayed</strong>
              <div style={{ fontSize: '12px', color: '#b91c1c', marginTop: '2px' }}>
                {errorMessage || 'Network congestion. Reward will be retried automatically.'}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {status === 'failed' && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            style={{
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Retry
          </button>
        )}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              fontSize: '16px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
