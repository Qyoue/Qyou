import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSortStore, SortField } from "@/src/store/sortStore";

const OPTIONS: { field: SortField; label: string }[] = [
  { field: "distance", label: "Distance" },
  { field: "queueLevel", label: "Queue Severity" },
];

export function SortOptionsBar() {
  const { field, direction, setSort } = useSortStore();

  return (
    <View style={styles.row}>
      <Text style={styles.label}>Sort:</Text>
      {OPTIONS.map((opt) => {
        const active = field === opt.field;
        return (
          <Pressable
            key={opt.field}
            style={[styles.btn, active && styles.btnActive]}
            onPress={() => setSort(opt.field, active && direction === "asc" ? "desc" : "asc")}
          >
            <Text style={[styles.btnText, active && styles.btnTextActive]}>
              {opt.label} {active ? (direction === "asc" ? "↑" : "↓") : ""}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 6 },
  label: { color: "#64748b", fontSize: 12 },
  btn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: "#334155" },
  btnActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  btnText: { color: "#94a3b8", fontSize: 12, fontWeight: "600" },
  btnTextActive: { color: "#fff" },
});
