import { useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import { apiClient, flushPendingRequests } from "@/src/network/apiClient";
import { useOfflineQueueStatus } from "@/src/network/useOfflineQueueStatus";

export default function Index() {
  const { isOnline, pendingCount, isFlushing } = useOfflineQueueStatus();
  const [lastAction, setLastAction] = useState("No actions yet.");

  const queueDemoMutation = async () => {
    try {
      const response = await apiClient.post("/queues/report", {
        waitTimeMinutes: 15,
        note: "offline-queue-demo",
      });

      if ((response.data as { queued?: boolean }).queued) {
        setLastAction("POST queued offline. It will sync automatically when internet returns.");
      } else {
        setLastAction("POST sent successfully.");
      }
    } catch {
      setLastAction("POST failed and could not be queued.");
    }
  };

  const triggerManualFlush = async () => {
    await flushPendingRequests();
    setLastAction("Manual sync triggered.");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Offline API Queue</Text>
      <Text style={styles.text}>Network: {isOnline ? "Online" : "Offline"}</Text>
      <Text style={styles.text}>Pending requests: {pendingCount}</Text>
      <Text style={styles.text}>Flushing: {isFlushing ? "Yes" : "No"}</Text>
      <View style={styles.spacer} />
      <Button title="Send Demo POST" onPress={queueDemoMutation} />
      <View style={styles.spacer} />
      <Button title="Manual Sync" onPress={triggerManualFlush} />
      <View style={styles.spacer} />
      <Text style={styles.note}>{lastAction}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    marginBottom: 4,
  },
  spacer: {
    height: 12,
  },
  note: {
    fontSize: 14,
    color: "#333",
  },
});
