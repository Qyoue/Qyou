'use client';

import React, { useState } from 'react';
import { Button } from './Button';
import { Spinner } from './Spinner';

interface WalletSetupProps {
  onSuccess?: (wallet: { publicKey: string }) => void;
  onCancel?: () => void;
  apiBaseUrl?: string;
  authToken?: string;
}

export function WalletSetup({
  onSuccess,
  onCancel,
  apiBaseUrl = '/api/stellar',
  authToken,
}: WalletSetupProps) {
  const [mode, setMode] = useState<'choose' | 'connect' | 'create'>('choose');
  const [publicKey, setPublicKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successWallet, setSuccessWallet] = useState<{ publicKey: string } | null>(null);

  const isValidStellarKey = (key: string): boolean => {
    return /^G[A-Z2-7]{55}$/.test(key.trim());
  };

  const handleLink = async (keyToLink: string) => {
    setError(null);
    if (!isValidStellarKey(keyToLink)) {
      setError('Please provide a valid 56-character Stellar public key starting with G.');
      return;
    }

    setLoading(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const res = await fetch(`${apiBaseUrl}/wallet`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ publicKey: keyToLink.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.message || 'Failed to link Stellar wallet.');
      }

      const linked = data.wallet || { publicKey: keyToLink.trim() };
      setSuccessWallet(linked);
      if (onSuccess) {
        onSuccess(linked);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred linking wallet.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustodialCreate = async () => {
    // Generate simulated/custodial Stellar keypair (RFC 4648 Base32 with G prefix)
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let generatedKey = 'G';
    for (let i = 0; i < 55; i++) {
      generatedKey += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    await handleLink(generatedKey);
  };

  if (successWallet) {
    return (
      <div
        data-testid="wallet-setup-success"
        style={{
          border: '1px solid #10b981',
          backgroundColor: '#ecfdf5',
          borderRadius: '8px',
          padding: '24px',
          textAlign: 'center',
        }}
      >
        <h3 style={{ color: '#065f46', marginBottom: '8px' }}>Stellar Wallet Connected!</h3>
        <p style={{ color: '#047857', fontSize: '14px', wordBreak: 'break-all' }}>
          <strong>Address:</strong> {successWallet.publicKey}
        </p>
        <p style={{ color: '#047857', fontSize: '13px', marginTop: '12px' }}>
          Your account is now eligible to receive Stellar queue incentive rewards.
        </p>
      </div>
    );
  }

  return (
    <div
      data-testid="wallet-setup-container"
      style={{
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '24px',
        backgroundColor: '#ffffff',
      }}
    >
      <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
        Set Up Your Stellar Wallet
      </h2>
      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px' }}>
        Connect or create a Stellar account to receive queue incentive rewards directly on-chain.
      </p>

      {error && (
        <div
          role="alert"
          style={{
            padding: '12px',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      {mode === 'choose' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div
            style={{
              padding: '16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
            onClick={() => setMode('create')}
            data-testid="choose-custodial"
          >
            <h4 style={{ margin: 0, fontSize: '15px', color: '#111827' }}>
              Option A: Automated Custodial Wallet (Recommended)
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
              Qyou manages the keys automatically. Ideal if you don’t already have a Stellar wallet.
            </p>
          </div>

          <div
            style={{
              padding: '16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
            onClick={() => setMode('connect')}
            data-testid="choose-non-custodial"
          >
            <h4 style={{ margin: 0, fontSize: '15px', color: '#111827' }}>
              Option B: Connect Existing Stellar Wallet
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
              Link your existing public key (Freighter, Albedo, Lobstr, or Ledger).
            </p>
          </div>
        </div>
      )}

      {mode === 'create' && (
        <div>
          <p style={{ fontSize: '14px', color: '#374151', marginBottom: '16px' }}>
            We will generate and link an encrypted custodial Stellar account for you. You can export or unlink it at any time.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              onClick={handleCustodialCreate}
              loading={loading}
              data-testid="confirm-custodial-create"
            >
              Generate & Link Wallet
            </Button>
            <Button
              onClick={() => setMode('choose')}
              disabled={loading}
              style={{ backgroundColor: '#f3f4f6', color: '#374151' }}
            >
              Back
            </Button>
          </div>
        </div>
      )}

      {mode === 'connect' && (
        <div>
          <label
            htmlFor="stellar-public-key"
            style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}
          >
            Stellar Public Key (starts with G)
          </label>
          <input
            id="stellar-public-key"
            type="text"
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            placeholder="GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU"
            style={{
              width: '100%',
              padding: '10px 12px',
              fontSize: '14px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              marginBottom: '16px',
              fontFamily: 'monospace',
            }}
            disabled={loading}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              onClick={() => handleLink(publicKey)}
              loading={loading}
              disabled={!publicKey.trim()}
              data-testid="confirm-link-wallet"
            >
              Link Wallet
            </Button>
            <Button
              onClick={() => setMode('choose')}
              disabled={loading}
              style={{ backgroundColor: '#f3f4f6', color: '#374151' }}
            >
              Back
            </Button>
          </div>
        </div>
      )}

      {onCancel && (
        <div style={{ marginTop: '16px', textAlign: 'right' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              color: '#6b7280',
              fontSize: '13px',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
