import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

const MAX_ATTEMPTS = 5;

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const log = (event: string, meta: Record<string, string> = {}) => {
    console.log("[mobile-signin]", event, meta);
  };

  const onSubmit = () => {
    const normalized = email.trim().toLowerCase();
    if (attempts >= MAX_ATTEMPTS) {
      setError("Too many failed attempts. Please try again later.");
      log("signin_blocked", { reason: "max_attempts" });
      return;
    }
    if (!normalized || !password) {
      setError("Email and password are required.");
      setAttempts((value) => value + 1);
      log("signin_failed", { reason: "missing_fields" });
      return;
    }

    setError("");
    setStatus("Sign-in simulated successfully.");
    log("signin_succeeded", { email_domain: normalized.split("@")[1] ?? "unknown" });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.subtitle}>Mobile sign-in baseline with instrumentation and guardrails.</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#7f96ab"
          style={styles.input}
          value={email}
        />
        <TextInput
          autoCapitalize="none"
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor="#7f96ab"
          secureTextEntry
          style={styles.input}
          value={password}
        />
        <Pressable style={styles.button} onPress={onSubmit}>
          <Text style={styles.buttonText}>Sign in</Text>
        </Pressable>
        <Text style={styles.meta}>Attempts: {attempts}/{MAX_ATTEMPTS}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {status ? <Text style={styles.status}>{status}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#08131c", justifyContent: "center", padding: 20 },
  card: { backgroundColor: "#122330", borderRadius: 24, padding: 24, borderWidth: 1, borderColor: "#1f3a4d", gap: 12 },
  title: { color: "#f4fbff", fontSize: 24, fontWeight: "800" },
  subtitle: { color: "#b5c5d4", fontSize: 13, lineHeight: 20 },
  input: { backgroundColor: "#0b1822", borderRadius: 14, borderWidth: 1, borderColor: "#264357", color: "#f4fbff", paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  button: { minHeight: 44, backgroundColor: "#9fe3ff", borderRadius: 12, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#06131d", fontSize: 14, fontWeight: "800" },
  meta: { color: "#b5c5d4", fontSize: 12 },
  error: { color: "#ff8a8a", fontSize: 13 },
  status: { color: "#9fe3ff", fontSize: 13 }
});
