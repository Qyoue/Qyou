import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useLocationsStore } from "@/src/store/locationsStore";

const LEVEL_COLORS: Record<string, string> = {
  none: "#22c55e", low: "#84cc16", medium: "#f59e0b", high: "#ef4444", unknown: "#94a3b8",
};

export default function NearbyListScreen() {
  const router = useRouter();
  const orderedIds = useLocationsStore((s) => s.orderedIds);
  const locationsById = useLocationsStore((s) => s.locationsById);
  const isPolling = useLocationsStore((s) => s.isPolling);

  const items = orderedIds.map((id) => locationsById[id]).filter(Boolean);

  if (items.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>{isPolling ? "Loading nearby locations…" : "No locations found nearby."}</Text>
        <Pressable style={styles.mapBtn} onPress={() => router.back()}>
          <Text style={styles.mapBtnText}>Back to Map</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nearby Locations</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.mapLink}>Map View</Text>
        </Pressable>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const level = item.queueSnapshot?.level ?? "unknown";
          const color = LEVEL_COLORS[level] ?? LEVEL_COLORS.unknown;
          return (
            <Pressable
              style={styles.row}
              onPress={() => router.push(`/location/${item.id}`)}
            >
              <View style={styles.rowLeft}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.address}>{item.address}</Text>
                <Text style={styles.distance}>{(item.distanceFromUser / 1000).toFixed(1)} km away</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: color }]}>
                <Text style={styles.badgeText}>{level}</Text>
              </View>
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f141a" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f141a", gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16 },
  title: { color: "#fff", fontSize: 18, fontWeight: "700" },
  mapLink: { color: "#3b82f6", fontSize: 14 },
  row: { flexDirection: "row", alignItems: "center", padding: 16, gap: 12 },
  rowLeft: { flex: 1, gap: 2 },
  name: { color: "#e2e8f0", fontSize: 15, fontWeight: "600" },
  address: { color: "#64748b", fontSize: 12 },
  distance: { color: "#475569", fontSize: 12 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  sep: { height: 1, backgroundColor: "#1e2a38" },
  empty: { color: "#64748b", fontSize: 15 },
  mapBtn: { backgroundColor: "#1e2a38", borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  mapBtnText: { color: "#3b82f6", fontSize: 14 },
});
