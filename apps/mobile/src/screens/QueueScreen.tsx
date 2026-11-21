import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from "react-native";

export interface QueueItem {
  id: string;
  name: string;
  description?: string;
  currentWaitMinutes: number;
  totalWaiting: number;
}

export function QueueScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQueue, setSelectedQueue] = useState<QueueItem | null>(null);
  const [userPosition, setUserPosition] = useState<number | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  const mockQueues: QueueItem[] = [
    { id: "q-1", name: "Downtown Express Service", description: "Quick consultation and ticket pickup", currentWaitMinutes: 12, totalWaiting: 5 },
    { id: "q-2", name: "Central Tech Support", description: "Hardware diagnostics and repairs", currentWaitMinutes: 28, totalWaiting: 14 },
    { id: "q-3", name: "General Inquiries", description: "Standard front-desk questions", currentWaitMinutes: 5, totalWaiting: 2 },
  ];

  const filteredQueues = mockQueues.filter(q =>
    q.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    q.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleJoinQueue = (queue: QueueItem) => {
    setIsJoining(true);
    // Optimistic join
    setUserPosition(queue.totalWaiting + 1);
    setSelectedQueue(queue);
    setIsJoining(false);
  };

  const handleLeaveQueue = () => {
    // Optimistic leave
    setUserPosition(null);
    setSelectedQueue(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Queue Discovery & Management</Text>
      
      {selectedQueue && userPosition !== null ? (
        <View style={styles.detailCard}>
          <Text style={styles.queueTitle}>{selectedQueue.name}</Text>
          <Text style={styles.detailText}>Live Position in Queue: #{userPosition}</Text>
          <Text style={styles.detailText}>Estimated Wait: {userPosition * 3} mins</Text>
          <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveQueue}>
            <Text style={styles.buttonText}>Leave Queue (Optimistic)</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <TextInput
            style={styles.searchInput}
            placeholder="Search queues..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <FlatList
            data={filteredQueues}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={styles.queueCard}>
                <Text style={styles.queueTitle}>{item.name}</Text>
                <Text style={styles.queueDesc}>{item.description}</Text>
                <Text style={styles.queueStats}>Est. Wait: {item.currentWaitMinutes}m | {item.totalWaiting} waiting</Text>
                <TouchableOpacity
                  style={styles.joinButton}
                  onPress={() => handleJoinQueue(item)}
                  disabled={isJoining}
                >
                  <Text style={styles.buttonText}>Join Queue</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f8fafc" },
  header: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
  searchInput: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, padding: 10, marginBottom: 12, backgroundColor: "#fff" },
  queueCard: { padding: 14, backgroundColor: "#fff", borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: "#e2e8f0" },
  detailCard: { padding: 16, backgroundColor: "#e0f2fe", borderRadius: 8, borderWidth: 1, borderColor: "#bae6fd" },
  queueTitle: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  queueDesc: { fontSize: 14, color: "#64748b", marginVertical: 4 },
  queueStats: { fontSize: 12, color: "#0284c7", marginBottom: 8 },
  detailText: { fontSize: 15, marginVertical: 4, color: "#0369a1" },
  joinButton: { backgroundColor: "#0284c7", padding: 8, borderRadius: 6, alignItems: "center" },
  leaveButton: { backgroundColor: "#ef4444", padding: 10, borderRadius: 6, alignItems: "center", marginTop: 12 },
  buttonText: { color: "#fff", fontWeight: "600" },
});
