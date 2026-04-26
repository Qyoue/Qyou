/**
 * LocationPermissionEducation – reusable component that explains why location
 * access is needed before the system prompt is shown.
 * Issue #173
 */

import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  message: string;
  onAllow: () => void;
  onSkip?: () => void;
};

export function LocationPermissionEducation({ message, onAllow, onSkip }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📍</Text>
      <Text style={styles.heading}>Allow location access</Text>
      <Text style={styles.body}>{message}</Text>

      <Pressable style={styles.primaryBtn} onPress={onAllow}>
        <Text style={styles.primaryLabel}>Allow location</Text>
      </Pressable>

      {onSkip ? (
        <Pressable style={styles.skipBtn} onPress={onSkip}>
          <Text style={styles.skipLabel}>Not now</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: "#080c12",
  },
  icon:        { fontSize: 48, marginBottom: 16 },
  heading:     { color: "#ffffff", fontSize: 22, fontWeight: "700", marginBottom: 12, textAlign: "center" },
  body:        { color: "#cfe0ef", fontSize: 15, textAlign: "center", lineHeight: 22, marginBottom: 32 },
  primaryBtn:  { backgroundColor: "#1a73e8", borderRadius: 10, paddingVertical: 14, paddingHorizontal: 40, marginBottom: 12 },
  primaryLabel:{ color: "#ffffff", fontSize: 16, fontWeight: "600" },
  skipBtn:     { paddingVertical: 10 },
  skipLabel:   { color: "#8ea2b5", fontSize: 14 },
});
