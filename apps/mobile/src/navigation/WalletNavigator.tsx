import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RewardsScreen } from '../screens/RewardsScreen';
import { WalletBalanceScreen } from '../screens/WalletBalanceScreen';
import { WalletSetupScreen } from '../screens/WalletSetupScreen';
import { OfflineBanner } from '../components/OfflineBanner';
import { useNetworkConnectivity } from '../hooks/useNetworkConnectivity';

type Tab = 'wallet' | 'setup' | 'rewards';

interface WalletNavigatorProps {
  /** Base URL of the Stellar API, e.g. https://api.example.com/api/v1/stellar */
  apiBaseUrl: string;
  authToken?: string;
}

/**
 * Minimal state-based navigation for the wallet area (no navigation library is a
 * dependency yet): balance <-> setup, plus a rewards tab, with an offline banner.
 */
export function WalletNavigator({ apiBaseUrl, authToken }: WalletNavigatorProps) {
  const [tab, setTab] = useState<Tab>('wallet');
  const online = useNetworkConnectivity();

  return (
    <View style={styles.container}>
      <OfflineBanner isOffline={!online} />
      <View style={styles.content}>
        {tab === 'wallet' && (
          <WalletBalanceScreen
            apiBaseUrl={apiBaseUrl}
            authToken={authToken}
            onNavigateToSetup={() => setTab('setup')}
          />
        )}
        {tab === 'setup' && (
          <WalletSetupScreen apiBaseUrl={apiBaseUrl} authToken={authToken} onSuccess={() => setTab('wallet')} />
        )}
        {tab === 'rewards' && <RewardsScreen apiBaseUrl={apiBaseUrl} authToken={authToken} />}
      </View>
      <View style={styles.tabs}>
        {(['wallet', 'rewards'] as const).map((t) => (
          <TouchableOpacity key={t} style={styles.tab} onPress={() => setTab(t)} accessibilityRole="button">
            <Text style={tab === t ? styles.tabActive : styles.tabText}>{t === 'wallet' ? 'Wallet' : 'Rewards'}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },
  tabs: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#d1d5db' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  tabText: { color: '#6b7280' },
  tabActive: { color: '#2563eb', fontWeight: '600' },
});
