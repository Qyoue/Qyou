import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface RewardItem {
  id: string;
  queueId: string;
  amount: string;
  asset: string;
  status: string;
  transactionHash?: string;
  createdAt: string;
}

interface RewardsScreenProps {
  apiBaseUrl?: string;
  authToken?: string;
}

/** Rewards history from `GET {apiBaseUrl}/rewards`, newest first, with "load more". */
export function RewardsScreen({ apiBaseUrl = 'http://localhost:4000/api/v1/stellar', authToken }: RewardsScreenProps) {
  const [items, setItems] = useState<RewardItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (next: string | null, append: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const query = next ? `?limit=20&cursor=${encodeURIComponent(next)}` : '?limit=20';
        const response = await fetch(`${apiBaseUrl}/rewards${query}`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error?.message || 'Failed to load rewards');
        }
        const data = (await response.json()) as { rewards: RewardItem[]; nextCursor: string | null };
        setItems((prev) => (append ? [...prev, ...data.rewards] : data.rewards));
        setCursor(data.nextCursor);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load rewards');
      } finally {
        setLoading(false);
      }
    },
    [apiBaseUrl, authToken],
  );

  useEffect(() => {
    void load(null, false);
  }, [load]);

  if (error && items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Could Not Load Rewards</Text>
        <Text style={styles.muted}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={() => load(null, false)}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading && items.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>No rewards yet</Text>
        <Text style={styles.muted}>Complete a queue with a linked wallet to earn rewards.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.amount}>
            {item.amount} {item.asset}
          </Text>
          <Text style={styles.muted}>
            {new Date(item.createdAt).toLocaleDateString()} · {item.status}
          </Text>
        </View>
      )}
      ListFooterComponent={
        cursor ? (
          <TouchableOpacity style={styles.button} onPress={() => load(cursor, true)} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Loading…' : 'Load more'}</Text>
          </TouchableOpacity>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 18, fontWeight: '600' },
  errorTitle: { fontSize: 18, fontWeight: '600', color: '#b91c1c' },
  muted: { color: '#6b7280', marginTop: 4, textAlign: 'center' },
  row: { padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e7eb' },
  amount: { fontSize: 16, fontWeight: '600' },
  button: { marginTop: 16, backgroundColor: '#2563eb', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignSelf: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
});
