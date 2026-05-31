import { StatusBar } from "expo-status-bar";
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useState } from "react";

const authPreview = {
  providers: ["email-password", "stellar-wallet-link"],
  sessionStrategy: "jwt",
  nextStep: "Build mobile sign-up, sign-in, session restore, and wallet linking."
} as const;

export default function App() {
  const [step, setStep] = useState<"start" | "submit" | "success" | "error">("start");

  const logSignupEvent = (event: string, meta: Record<string, string> = {}) => {
    console.log("[mobile-signup]", event, meta);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Qyou mobile starter</Text>
        <Text style={styles.title}>Auth comes first.</Text>
        <Text style={styles.body}>
          This Expo workspace is a clean landing zone for hackathon contributors. The first milestone is shared
          authentication across mobile, web, API, and Stellar-linked identity flows.
        </Text>
        <Text style={styles.body}>Checkpoint: {step}</Text>
        <View style={styles.actions}>
          <Pressable
            style={styles.button}
            onPress={() => {
              setStep("submit");
              logSignupEvent("signup_attempted");
            }}
          >
            <Text style={styles.buttonText}>Simulate Submit</Text>
          </Pressable>
          <Pressable
            style={styles.button}
            onPress={() => {
              setStep("success");
              logSignupEvent("signup_succeeded");
            }}
          >
            <Text style={styles.buttonText}>Simulate Success</Text>
          </Pressable>
          <Pressable
            style={styles.button}
            onPress={() => {
              setStep("error");
              logSignupEvent("signup_failed", { reason: "network" });
            }}
          >
            <Text style={styles.buttonText}>Simulate Failure</Text>
          </Pressable>
        </View>
        <Text style={styles.code}>{JSON.stringify(authPreview, null, 2)}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    alignItems: "center",
    backgroundColor: "#f4ecdf",
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  card: {
    backgroundColor: "#fff9f1",
    borderColor: "#ddb38c",
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    maxWidth: 420,
    padding: 24,
    width: "100%"
  },
  eyebrow: {
    color: "#a24a21",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase"
  },
  title: {
    color: "#1f1d1a",
    fontSize: 32,
    fontWeight: "700"
  },
  body: {
    color: "#5f584f",
    fontSize: 16,
    lineHeight: 24
  },
  code: {
    backgroundColor: "#1f1d1a",
    borderRadius: 18,
    color: "#f7f0e4",
    fontFamily: "Courier",
    overflow: "hidden",
    padding: 16
  },
  actions: {
    gap: 8
  },
  button: {
    backgroundColor: "#1f1d1a",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600"
  }
});
