import { StyleSheet, Text, View } from "react-native";
import { useOfflineQueueStatus } from "./useOfflineQueueStatus";

const buildMessage = (state: ReturnType<typeof useOfflineQueueStatus>) => {
  if (!state.isOnline) {
    if (state.pendingCount > 0) {
      return `${state.pendingCount} request${state.pendingCount === 1 ? "" : "s"} queued offline`;
    }
    return "Offline mode active";
  }

  if (state.isFlushing && state.pendingCount > 0) {
    return `Syncing ${state.pendingCount} queued request${state.pendingCount === 1 ? "" : "s"}`;
  }

  return null;
};

export const NetworkStatusBanner = () => {
  const state = useOfflineQueueStatus();
  const message = buildMessage(state);

  if (!message) {
    return null;
  }

  const toneStyle = state.isOnline ? styles.syncing : styles.offline;

  return (
    <View pointerEvents="none" style={[styles.container, toneStyle]}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 18,
    left: 16,
    right: 16,
    zIndex: 20,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
  },
  offline: {
    backgroundColor: "rgba(102, 26, 26, 0.95)",
    borderColor: "#ff9d9d",
  },
  syncing: {
    backgroundColor: "rgba(17, 66, 84, 0.95)",
    borderColor: "#97ecff",
  },
  text: {
    color: "#f7fbff",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
});
