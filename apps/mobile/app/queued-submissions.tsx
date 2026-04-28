import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { QueuedRequest } from "@/src/network/types";

const QUEUE_KEY = "qyou_offline_request_queue_v1";

export default function QueuedSubmissionsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<QueuedRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(QUEUE_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as QueuedRequest[];
        setItems(Array.isArray(parsed) ? parsed : []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Queued Submissions</Text>
      </View>

      {loading ? (
        <Text style={styles.empty}>Loading…</Text>
      ) : items.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.empty}>No pending submissions.</Text>
          <Text style={styles.sub}>Reports submitted while offline will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.method}>{item.method.toUpperCase()}</Text>
              <View style={styles.rowRight}>
                <Text style={styles.url}>{item.url}</Text>
                <Text style={styles.meta}>
                  Queued {new Date(item.createdAt).toLocaleString()} · {item.retryCount} retries
                </Text>
              </View>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f141a" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  back: { color: "#3b82f6", fontSize: 15 },
  title: { color: "#fff", fontSize: 18, fontWeight: "700" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  empty: { color: "#64748b", fontSize: 15, textAlign: "center" },
  sub: { color: "#334155", fontSize: 13, textAlign: "center", paddingHorizontal: 32 },
  row: { flexDirection: "row", padding: 14, gap: 10, alignItems: "flex-start" },
  method: { color: "#3b82f6", fontWeight: "700", fontSize: 12, paddingTop: 2 },
  rowRight: { flex: 1, gap: 2 },
  url: { color: "#e2e8f0", fontSize: 13 },
  meta: { color: "#475569", fontSize: 11 },
  sep: { height: 1, backgroundColor: "#1e2a38" },
});
