import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useAuth } from "../hooks/useAuth";

export function RegisterScreen({ onNavigateLogin }: { onNavigateLogin?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const { register } = useAuth();

  const handleRegister = async () => {
    try {
      await register(email, password);
      setStatus("Registration successful! Please check your email for the verification link.");
    } catch (e: any) {
      setStatus(e.message || "Registration failed");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      {status && <Text style={styles.status}>{status}</Text>}
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Sign Up</Text>
      </TouchableOpacity>
      {onNavigateLogin && (
        <TouchableOpacity style={styles.linkButton} onPress={onNavigateLogin}>
          <Text style={styles.linkText}>Already have an account? Sign in</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function PasswordResetScreen() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState<"request" | "reset">("request");
  const [status, setStatus] = useState<string | null>(null);
  const { requestPasswordReset, resetPassword } = useAuth();

  const handleRequest = async () => {
    await requestPasswordReset(email);
    setStatus("Reset token sent if the account exists.");
    setStep("reset");
  };

  const handleReset = async () => {
    const success = await resetPassword(token, newPassword);
    setStatus(success ? "Password has been successfully reset!" : "Failed to reset password.");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{step === "request" ? "Forgot Password" : "Reset Password"}</Text>
      {status && <Text style={styles.status}>{status}</Text>}
      {step === "request" ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="Enter your registered email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TouchableOpacity style={styles.button} onPress={handleRequest}>
            <Text style={styles.buttonText}>Send Reset Link</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Enter token from email"
            value={token}
            onChangeText={setToken}
          />
          <TextInput
            style={styles.input}
            placeholder="New password"
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <TouchableOpacity style={styles.button} onPress={handleReset}>
            <Text style={styles.buttonText}>Update Password</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: "center", backgroundColor: "#fff" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20, color: "#0f172a" },
  status: { marginBottom: 12, color: "#0284c7" },
  input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, padding: 12, marginBottom: 16 },
  button: { backgroundColor: "#0284c7", padding: 14, borderRadius: 8, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  linkButton: { marginTop: 16, alignItems: "center" },
  linkText: { color: "#0284c7" },
});
