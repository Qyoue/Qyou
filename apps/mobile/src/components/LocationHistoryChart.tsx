import { StyleSheet, Text, View } from "react-native";

type Props = {
  locationId: string;
};

/**
 * Shell for the location queue-history chart.
 * Renders a placeholder until the history endpoint is live.
 */
export function LocationHistoryChart({ locationId: _locationId }: Props) {
  return (
    <View style={styles.shell}>
      <Text style={styles.label}>Queue History</Text>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>History chart coming soon</Text>
        <Text style={styles.sub}>Trend data will appear here once the history endpoint is live.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { marginTop: 20 },
  label: { color: "#94a3b8", fontSize: 13, fontWeight: "600", marginBottom: 8 },
  placeholder: {
    backgroundColor: "#1e2a38",
    borderRadius: 10,
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#334155",
    borderStyle: "dashed",
  },
  placeholderText: { color: "#475569", fontSize: 14, fontWeight: "600" },
  sub: { color: "#334155", fontSize: 11, textAlign: "center", paddingHorizontal: 24 },
});
