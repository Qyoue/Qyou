import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

interface WalletBalanceScreenProps {
  onNavigateToSetup?: () => void;
  apiBaseUrl?: string;
  authToken?: string;
}

export function WalletBalanceScreen({
  onNavigateToSetup,
  apiBaseUrl = 'http://localhost:4000/api/stellar',
  authToken,
}: WalletBalanceScreenProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletData, setWalletData] = useState<{
    publicKey: string;
    xlm: string;
  } | null>(null);

  const fetchBalance = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${apiBaseUrl}/wallet`, { headers });
      if (response.status === 404) {
        setWalletData(null);
        return;
      }

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error?.message || errJson.message || 'Failed to fetch balance');
      }

      const data = await response.json();
      setWalletData({
        publicKey: data.wallet?.publicKey || '',
        xlm: data.balances?.xlm || '0.0000000',
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error fetching Stellar wallet');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, authToken]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const truncateKey = (key: string) => {
    if (!key || key.length < 12) return key;
    return `${key.slice(0, 6)}...${key.slice(-6)}`;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Fetching Stellar balances...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Could Not Load Balance</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.actionButton} onPress={fetchBalance}>
          <Text style={styles.actionButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!walletData) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyTitle}>No Stellar Wallet Linked</Text>
        <Text style={styles.emptySubtitle}>
          Connect your Stellar account to earn queue rewards.
        </Text>
        {onNavigateToSetup && (
          <TouchableOpacity style={styles.primaryButton} onPress={onNavigateToSetup}>
            <Text style={styles.primaryButtonText}>Set Up Wallet</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Active</Text>
        </View>

        <Text style={styles.balanceLabel}>Available Stellar Balance</Text>
        <Text style={styles.balanceAmount}>{walletData.xlm} XLM</Text>

        <View style={styles.divider} />

        <Text style={styles.addressLabel}>Linked Public Address</Text>
        <Text style={styles.addressValue}>{truncateKey(walletData.publicKey)}</Text>

        <TouchableOpacity style={styles.refreshButton} onPress={fetchBalance}>
          <Text style={styles.refreshButtonText}>Refresh Balance</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#d1fae5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 16,
  },
  badgeText: {
    color: '#065f46',
    fontSize: 12,
    fontWeight: '700',
  },
  balanceLabel: {
    fontSize: 13,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 16,
  },
  addressLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  addressValue: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#374151',
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 12,
    color: '#6b7280',
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
