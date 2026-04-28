import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  onReportAnother: () => void;
  onDismiss: () => void;
  queued?: boolean;
};

export function ReportSuccessState({ onReportAnother, onDismiss, queued }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>✓</Text>
      <Text style={styles.title}>{queued ? "Report Queued" : "Report Submitted"}</Text>
      <Text style={styles.sub}>
        {queued
          ? "You're offline. Your report will sync automatically when you reconnect."
          : "Thanks for contributing! Your data helps others plan better."}
      </Text>
      <View style={styles.actions}>
        <Pressable style={styles.primaryBtn} onPress={onReportAnother}>
          <Text style={styles.primaryBtnText}>Report Again</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={onDismiss}>
          <Text style={styles.secondaryBtnText}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", padding: 24, gap: 12 },
  icon: { fontSize: 48, color: "#22c55e" },
  title: { color: "#fff", fontSize: 20, fontWeight: "700" },
  sub: { color: "#94a3b8", fontSize: 14, textAlign: "center", lineHeight: 20 },
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
  primaryBtn: { backgroundColor: "#3b82f6", borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  secondaryBtn: { backgroundColor: "#1e2a38", borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10 },
  secondaryBtnText: { color: "#94a3b8", fontSize: 14 },
});
