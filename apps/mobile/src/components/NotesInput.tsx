import { StyleSheet, Text, TextInput, View } from "react-native";

const MAX_CHARS = 280;

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export function NotesInput({ value, onChange }: Props) {
  const remaining = MAX_CHARS - value.length;
  const nearLimit = remaining <= 30;

  return (
    <View style={styles.wrap}>
      <TextInput
        style={[styles.input, nearLimit && styles.inputWarn]}
        value={value}
        onChangeText={(t) => onChange(t.slice(0, MAX_CHARS))}
        placeholder="Any additional context…"
        placeholderTextColor="#475569"
        multiline
        maxLength={MAX_CHARS}
        accessibilityLabel="Report notes"
      />
      <Text style={[styles.counter, nearLimit && styles.counterWarn]}>
        {remaining} / {MAX_CHARS}
      </Text>
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
    height: 80,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "transparent",
  },
  inputWarn: { borderColor: "#f59e0b" },
  counter: { color: "#475569", fontSize: 11, textAlign: "right" },
  counterWarn: { color: "#f59e0b" },
});
