import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { LocationType } from "@qyou/types";
import { useFilterStore, RadiusOption } from "@/src/store/filterStore";

const TYPES: { value: LocationType; label: string }[] = [
  { value: "bank", label: "Bank" },
  { value: "hospital", label: "Hospital" },
  { value: "atm", label: "ATM" },
  { value: "government", label: "Gov" },
  { value: "fuel_station", label: "Fuel" },
  { value: "other", label: "Other" },
];

const RADII: { value: RadiusOption; label: string }[] = [
  { value: 500, label: "500m" },
  { value: 1000, label: "1km" },
  { value: 2000, label: "2km" },
  { value: 5000, label: "5km" },
];

export function FilterBar() {
  const { locationType, radius, setLocationType, setRadius } = useFilterStore();

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <Pressable
          style={[styles.chip, locationType === null && styles.chipActive]}
          onPress={() => setLocationType(null)}
        >
          <Text style={[styles.chipText, locationType === null && styles.chipTextActive]}>All</Text>
        </Pressable>
        {TYPES.map((t) => (
          <Pressable
            key={t.value}
            style={[styles.chip, locationType === t.value && styles.chipActive]}
            onPress={() => setLocationType(locationType === t.value ? null : t.value)}
          >
            <Text style={[styles.chipText, locationType === t.value && styles.chipTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
        <View style={styles.divider} />
        {RADII.map((r) => (
          <Pressable
            key={r.value}
            style={[styles.chip, radius === r.value && styles.chipActive]}
            onPress={() => setRadius(r.value)}
          >
            <Text style={[styles.chipText, radius === r.value && styles.chipTextActive]}>{r.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#0f141a", paddingVertical: 6 },
  row: { paddingHorizontal: 12, gap: 6, alignItems: "center" },
  chip: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: "#334155" },
  chipActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  chipText: { color: "#64748b", fontSize: 12, fontWeight: "600" },
  chipTextActive: { color: "#fff" },
  divider: { width: 1, height: 20, backgroundColor: "#334155", marginHorizontal: 4 },
});
