'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Spinner } from './Spinner';
import { Button } from './Button';

export interface WalletBalanceData {
  wallet: {
    userId: string;
    publicKey: string;
    createdAt: number;
  };
  balances: {
    publicKey: string;
    xlm: string;
    balances: Array<{ asset: string; balance: string; isNative: boolean }>;
    fetchedAt: number;
    fromCache?: boolean;
  };
}

interface WalletBalanceCardProps {
  apiBaseUrl?: string;
  authToken?: string;
  onSetupClick?: () => void;
}

export function WalletBalanceCard({
  apiBaseUrl = '/api/stellar',
  authToken,
  onSetupClick,
}: WalletBalanceCardProps) {
  const [data, setData] = useState<WalletBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUnlinked, setIsUnlinked] = useState(false);

  const fetchWallet = useCallback(async () => {
    setLoading(true);
    setError(null);
    setIsUnlinked(false);

    try {
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const res = await fetch(`${apiBaseUrl}/wallet`, { headers });

      if (res.status === 404) {
        setIsUnlinked(true);
        setData(null);
        return;
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || errJson.message || `Failed to fetch wallet (${res.status})`);
      }

      const resData = await res.json();
      setData(resData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching Stellar wallet balances');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, authToken]);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  const truncateAddress = (addr: string) => {
    if (!addr || addr.length <= 12) return addr;
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 6)}`;
  };

  // 1. Loading State
  if (loading) {
    return (
      <div
        data-testid="wallet-balance-loading"
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '24px',
          backgroundColor: '#f9fafb',
          textAlign: 'center',
        }}
      >
        <Spinner />
        <p style={{ marginTop: '12px', fontSize: '14px', color: '#6b7280' }}>
          Loading Stellar wallet balances...
        </p>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div
        data-testid="wallet-balance-error"
        role="alert"
        style={{
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '24px',
          backgroundColor: '#fef2f2',
          color: '#991b1b',
        }}
      >
        <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600 }}>
          Unable to Load Wallet
        </h4>
        <p style={{ margin: '0 0 16px 0', fontSize: '14px' }}>{error}</p>
        <Button onClick={fetchWallet} style={{ backgroundColor: '#dc2626', color: '#fff' }}>
          Retry
        </Button>
      </div>
    );
  }

  // 3. No Wallet Linked Yet State
  if (isUnlinked || !data) {
    return (
      <div
        data-testid="wallet-balance-unlinked"
        style={{
          border: '1px dashed #d1d5db',
          borderRadius: '8px',
          padding: '24px',
          backgroundColor: '#ffffff',
          textAlign: 'center',
        }}
      >
        <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 600, color: '#111827' }}>
          No Stellar Wallet Linked Yet
        </h4>
        <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6b7280' }}>
          Connect or create a Stellar wallet to begin earning queue incentive rewards.
        </p>
        {onSetupClick ? (
          <Button onClick={onSetupClick} data-testid="setup-wallet-button">
            Set Up Wallet
          </Button>
        ) : (
          <a
            href="/settings/wallet"
            data-testid="setup-wallet-link"
            style={{
              display: 'inline-block',
              padding: '8px 16px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Set Up Wallet
          </a>
        )}
      </div>
    );
  }

  // 4. Linked Wallet & Balance State
  return (
    <div
      data-testid="wallet-balance-card"
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '24px',
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <span
            style={{
              display: 'inline-block',
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              color: '#059669',
              backgroundColor: '#d1fae5',
              padding: '2px 8px',
              borderRadius: '9999px',
              marginBottom: '6px',
            }}
          >
            Stellar Connected
          </span>
          <p
            style={{ margin: 0, fontSize: '13px', color: '#6b7280', fontFamily: 'monospace' }}
            title={data.wallet.publicKey}
          >
            {truncateAddress(data.wallet.publicKey)}
          </p>
        </div>
        <button
          type="button"
          onClick={fetchWallet}
          data-testid="refresh-balance-button"
          style={{
            fontSize: '12px',
            background: 'none',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            padding: '4px 8px',
            cursor: 'pointer',
            color: '#374151',
          }}
        >
          Refresh
        </button>
      </div>

      <div style={{ marginTop: '16px' }}>
        <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Available Balance
        </p>
        <h3
          data-testid="wallet-xlm-balance"
          style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: '#111827' }}
        >
          {data.balances?.xlm || '0.0000000'} <span style={{ fontSize: '16px', fontWeight: 500, color: '#6b7280' }}>XLM</span>
        </h3>
      </div>
    </div>
  );
}
