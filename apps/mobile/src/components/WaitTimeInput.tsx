import { StyleSheet, Text, TextInput, View } from "react-native";

const MIN_WAIT = 0;
const MAX_WAIT = 300;

type Props = {
  value: string;
  onChange: (v: string) => void;
  error?: string;
};

export function validateWaitTime(raw: string): string | null {
  if (raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return "Must be a whole number.";
  if (n < MIN_WAIT) return `Minimum is ${MIN_WAIT} minutes.`;
  if (n > MAX_WAIT) return `Maximum is ${MAX_WAIT} minutes.`;
  return null;
}

export function WaitTimeInput({ value, onChange, error }: Props) {
  return (
    <View style={styles.wrap}>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        value={value}
        onChangeText={onChange}
        keyboardType="numeric"
        placeholder="e.g. 15"
        placeholderTextColor="#475569"
        maxLength={4}
        accessibilityLabel="Estimated wait time in minutes"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.hint}>0 – 300 minutes</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  input: {
    backgroundColor: "#1e2a38",
    color: "#e2e8f0",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "transparent",
  },
  inputError: { borderColor: "#ef4444" },
  error: { color: "#ef4444", fontSize: 12 },
  hint: { color: "#475569", fontSize: 11 },
});
