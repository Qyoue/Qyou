import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiClient } from "@/src/network/apiClient";
import type { QueueLevel } from "@qyou/types";

const LEVELS: { value: QueueLevel; label: string; color: string }[] = [
  { value: "none", label: "No Queue", color: "#22c55e" },
  { value: "low", label: "Low", color: "#84cc16" },
  { value: "medium", label: "Medium", color: "#f59e0b" },
  { value: "high", label: "High", color: "#ef4444" },
  { value: "unknown", label: "Unknown", color: "#94a3b8" },
];

export default function ReportComposerModal() {
  const { locationId } = useLocalSearchParams<{ locationId: string }>();
  const router = useRouter();
  const [level, setLevel] = useState<QueueLevel>("medium");
  const [waitTime, setWaitTime] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const submit = async () => {
    if (!locationId) return;
    setStatus("submitting");
    try {
      await apiClient.post("/queues/report", {
        locationId,
        level,
        waitTimeMinutes: waitTime ? Number(waitTime) : undefined,
        notes: notes.trim() || undefined,
      });
      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMsg("Submission failed. It may be queued for later sync.");
    }
  };

  if (status === "success") {
    return (
      <View style={styles.centered}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.successTitle}>Report Submitted</Text>
        <Text style={styles.successSub}>Thanks for contributing queue data!</Text>
        <Pressable style={styles.doneBtn} onPress={() => router.back()}>
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Report Queue</Text>

      <Text style={styles.label}>Queue Level</Text>
      <View style={styles.levelRow}>
        {LEVELS.map((l) => (
          <Pressable
            key={l.value}
            style={[styles.levelBtn, { borderColor: l.color }, level === l.value && { backgroundColor: l.color }]}
            onPress={() => setLevel(l.value)}
          >
            <Text style={[styles.levelBtnText, level === l.value && { color: "#fff" }]}>{l.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Wait Time (minutes)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={waitTime}
        onChangeText={setWaitTime}
        placeholder="Optional"
        placeholderTextColor="#475569"
        maxLength={4}
      />

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Any additional context…"
        placeholderTextColor="#475569"
        multiline
        maxLength={280}
      />

      {status === "error" && <Text style={styles.errorText}>{errorMsg}</Text>}

      <Pressable
        style={[styles.submitBtn, status === "submitting" && styles.submitBtnDisabled]}
        onPress={submit}
        disabled={status === "submitting"}
      >
        {status === "submitting" ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitBtnText}>Submit Report</Text>
        )}
      </Pressable>

      <Pressable style={styles.cancelBtn} onPress={() => router.back()}>
        <Text style={styles.cancelBtnText}>Cancel</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f141a" },
  content: { padding: 20, gap: 12 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f141a", gap: 12 },
  title: { color: "#fff", fontSize: 20, fontWeight: "700", marginBottom: 8 },
  label: { color: "#94a3b8", fontSize: 13, fontWeight: "600" },
  levelRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  levelBtn: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  levelBtnText: { color: "#94a3b8", fontSize: 13, fontWeight: "600" },
  input: { backgroundColor: "#1e2a38", color: "#e2e8f0", borderRadius: 8, padding: 12, fontSize: 14 },
  textarea: { height: 80, textAlignVertical: "top" },
  submitBtn: { backgroundColor: "#3b82f6", borderRadius: 10, padding: 14, alignItems: "center" },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  cancelBtn: { alignItems: "center", padding: 12 },
  cancelBtnText: { color: "#64748b", fontSize: 14 },
  errorText: { color: "#f59e0b", fontSize: 13 },
  successIcon: { fontSize: 48, color: "#22c55e" },
  successTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  successSub: { color: "#94a3b8", fontSize: 14 },
  doneBtn: { backgroundColor: "#3b82f6", borderRadius: 10, paddingHorizontal: 32, paddingVertical: 12, marginTop: 8 },
  doneBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
