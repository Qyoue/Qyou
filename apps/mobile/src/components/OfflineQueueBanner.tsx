import { StyleSheet, Text, View } from "react-native";
import { useOfflineQueueStatus } from "@/src/network/useOfflineQueueStatus";

export function OfflineQueueBanner() {
  const { isOnline, pendingCount, isFlushing } = useOfflineQueueStatus();

  if (isOnline && pendingCount === 0) return null;

  if (isFlushing) {
    return (
      <View style={[styles.banner, styles.syncing]}>
        <Text style={styles.text}>⟳ Syncing {pendingCount} queued report{pendingCount !== 1 ? "s" : ""}…</Text>
      </View>
    );
  }

  if (!isOnline && pendingCount > 0) {
    return (
      <View style={[styles.banner, styles.offline]}>
        <Text style={styles.text}>
          Offline · {pendingCount} report{pendingCount !== 1 ? "s" : ""} queued for sync
        </Text>
      </View>
    );
  }

  if (!isOnline) {
    return (
      <View style={[styles.banner, styles.offline]}>
        <Text style={styles.text}>Offline · Reports will be queued until reconnected</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  banner: { paddingHorizontal: 16, paddingVertical: 8, alignItems: "center" },
  offline: { backgroundColor: "#7c3aed" },
  syncing: { backgroundColor: "#0284c7" },
  text: { color: "#fff", fontSize: 13, fontWeight: "600" },
});
