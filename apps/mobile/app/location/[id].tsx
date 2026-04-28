import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiClient } from "@/src/network/apiClient";
import type { LocationDetailsResponse } from "@/src/network/contracts";
import type { LocationDetailsItem } from "@qyou/types";

const LEVEL_COLORS: Record<string, string> = {
  none: "#22c55e",
  low: "#84cc16",
  medium: "#f59e0b",
  high: "#ef4444",
  unknown: "#94a3b8",
};

export default function LocationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<LocationDetailsItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiClient
      .get<LocationDetailsResponse>(`/queues/${id}`)
      .then((res) => {
        const data = res.data;
        if (data.success) {
          setItem(data.data.item ?? null);
        } else {
          setError("Failed to load location.");
        }
      })
      .catch(() => setError("Network error. Please try again."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (error || !item) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? "Location not found."}</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const snap = item.queueSnapshot;
  const level = snap?.level ?? "unknown";
  const levelColor = LEVEL_COLORS[level] ?? LEVEL_COLORS.unknown;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>← Back</Text>
      </Pressable>

      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.address}>{item.address}</Text>
      <Text style={styles.type}>{item.type.replace("_", " ")}</Text>

      {snap ? (
        <View style={styles.snapshotCard}>
          <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
            <Text style={styles.levelText}>{level.toUpperCase()}</Text>
          </View>
          {snap.estimatedWaitMinutes != null && (
            <Text style={styles.wait}>~{snap.estimatedWaitMinutes} min wait</Text>
          )}
          {snap.isStale && (
            <Text style={styles.staleWarning}>⚠ Data may be outdated</Text>
          )}
          <Text style={styles.meta}>
            {snap.reportCount} report{snap.reportCount !== 1 ? "s" : ""} · {Math.round(snap.confidence * 100)}% confidence
          </Text>
        </View>
      ) : (
        <View style={styles.snapshotCard}>
          <Text style={styles.noData}>No queue data available yet.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f141a" },
  content: { padding: 20 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f141a" },
  errorText: { color: "#ef4444", fontSize: 15, marginBottom: 16 },
  backBtn: { marginBottom: 16, alignSelf: "flex-start" },
  backBtnText: { color: "#3b82f6", fontSize: 15 },
  name: { color: "#fff", fontSize: 22, fontWeight: "700", marginBottom: 4 },
  address: { color: "#94a3b8", fontSize: 14, marginBottom: 4 },
  type: { color: "#64748b", fontSize: 13, textTransform: "capitalize", marginBottom: 20 },
  snapshotCard: { backgroundColor: "#1e2a38", borderRadius: 12, padding: 16, gap: 8 },
  levelBadge: { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  levelText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  wait: { color: "#e2e8f0", fontSize: 15, fontWeight: "600" },
  staleWarning: { color: "#f59e0b", fontSize: 13 },
  meta: { color: "#64748b", fontSize: 12 },
  noData: { color: "#64748b", fontSize: 14 },
});
