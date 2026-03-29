import { Link, router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { loginWithEmail } from "@/src/auth/authClient";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError("Email and password are required.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await loginWithEmail({
        email: normalizedEmail,
        password,
      });
      router.replace("/");
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : "Unable to sign in with those credentials.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.select({ ios: "padding", default: undefined })}
      style={styles.screen}
    >
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Qyou Mobile</Text>
        <Text style={styles.title}>Sign in to your queue workspace</Text>
        <Text style={styles.subtitle}>
          Restore your reporting session and keep your device ready for live queue updates.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#7f96ab"
            style={styles.input}
            value={email}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setPassword}
            placeholder="Minimum 8 characters"
            placeholderTextColor="#7f96ab"
            secureTextEntry
            style={styles.input}
            value={password}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable disabled={isSubmitting} onPress={() => void handleSubmit()} style={styles.primaryButton}>
          {isSubmitting ? <ActivityIndicator color="#06131d" /> : <Text style={styles.primaryText}>Sign In</Text>}
        </Pressable>

        <Text style={styles.footerText}>
          Need an account? <Link href="/register" style={styles.link}>Create one</Link>
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#08131c",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#122330",
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: "#1f3a4d",
    gap: 14,
  },
  eyebrow: {
    color: "#8ec6ff",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.1,
  },
  title: {
    color: "#f4fbff",
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: "#b5c5d4",
    fontSize: 14,
    lineHeight: 21,
  },
  field: {
    gap: 6,
  },
  label: {
    color: "#d7e4ef",
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#0b1822",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#264357",
    color: "#f4fbff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  error: {
    color: "#ff8a8a",
    fontSize: 13,
  },
  primaryButton: {
    minHeight: 50,
    backgroundColor: "#9fe3ff",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryText: {
    color: "#06131d",
    fontSize: 15,
    fontWeight: "800",
  },
  footerText: {
    color: "#b5c5d4",
    fontSize: 13,
    textAlign: "center",
  },
  link: {
    color: "#9fe3ff",
    fontWeight: "700",
  },
});

