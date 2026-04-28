import { Pressable, StyleSheet, Text, View } from "react-native";
import type { QueueLevel } from "@qyou/types";

const LEVELS: { value: QueueLevel; label: string; color: string }[] = [
  { value: "none", label: "None", color: "#22c55e" },
  { value: "low", label: "Low", color: "#84cc16" },
  { value: "medium", label: "Medium", color: "#f59e0b" },
  { value: "high", label: "High", color: "#ef4444" },
  { value: "unknown", label: "Unknown", color: "#94a3b8" },
];

type Props = {
  value: QueueLevel;
  onChange: (level: QueueLevel) => void;
};

export function QueueLevelPicker({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      {LEVELS.map((l) => {
        const active = value === l.value;
        return (
          <Pressable
            key={l.value}
            style={[styles.btn, { borderColor: l.color }, active && { backgroundColor: l.color }]}
            onPress={() => onChange(l.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={l.label}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{l.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  btn: { borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  label: { color: "#94a3b8", fontSize: 13, fontWeight: "600" },
  labelActive: { color: "#fff" },
});
