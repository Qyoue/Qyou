import { Link } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

const MIN_PASSWORD = 8;

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const log = (event: string, meta: Record<string, string> = {}) => {
    console.log("[mobile-recovery]", event, meta);
  };

  const handleRequest = () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized) {
      setError("Email is required.");
      return;
    }
    setError("");
    setStatus("Reset link simulated. Continue with your new password.");
    log("recovery_requested", { email_domain: normalized.split("@")[1] ?? "unknown" });
  };

  const handleComplete = () => {
    if (nextPassword.length < MIN_PASSWORD) {
      setError(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    setError("");
    setStatus("Password reset completed.");
    log("recovery_completed");
  };

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.title}>Recover your password</Text>
        <Text style={styles.subtitle}>Mobile recovery flow with instrumentation and guardrails.</Text>

        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#7f96ab"
          style={styles.input}
          value={email}
        />
        <Pressable style={styles.button} onPress={handleRequest}>
          <Text style={styles.buttonText}>Request Reset</Text>
        </Pressable>

        <TextInput
          autoCapitalize="none"
          onChangeText={setNextPassword}
          placeholder="New password"
          placeholderTextColor="#7f96ab"
          secureTextEntry
          style={styles.input}
          value={nextPassword}
        />
        <Pressable style={styles.button} onPress={handleComplete}>
          <Text style={styles.buttonText}>Complete Reset</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {status ? <Text style={styles.status}>{status}</Text> : null}

        <Text style={styles.linkWrap}>
          <Link href="/login" style={styles.link}>Back to sign in</Link>
        </Text>
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
  error: { color: "#ff8a8a", fontSize: 13 },
  status: { color: "#9fe3ff", fontSize: 13 },
  linkWrap: { textAlign: "center" },
  link: { color: "#9fe3ff", fontWeight: "700" },
});
