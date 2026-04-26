import { Stack, router, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { initializeApiClient, shutdownApiClient } from "@/src/network/apiClient";
import { Button, StyleSheet, Text, View } from "react-native";
import { useSessionBootstrap } from "@/src/auth/useSessionBootstrap";
import { NetworkStatusBanner } from "@/src/network/NetworkStatusBanner";

const AUTH_ROUTES = new Set(["login", "register"]);

export default function RootLayout() {
  const { state, message, retry } = useSessionBootstrap();
  const segments = useSegments();
  const [apiState, setApiState] = useState<"loading" | "ready" | "error">("loading");
  const [apiMessage, setApiMessage] = useState("Preparing offline queue and network client...");
  const [initAttempt, setInitAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void initializeApiClient()
      .then(() => {
        if (cancelled) {
          return;
        }
        setApiState("ready");
        setApiMessage("Network client ready.");
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setApiState("error");
        setApiMessage("Unable to start the network client. Retry to continue.");
      });

    return () => {
      cancelled = true;
      shutdownApiClient();
    };
  }, [initAttempt]);

  useEffect(() => {
    if (state === "loading" || state === "locked") {
      return;
    }

    const activeRoute = segments[0];
    const isAuthRoute = typeof activeRoute === "string" && AUTH_ROUTES.has(activeRoute);

    if (state === "unauthenticated" && !isAuthRoute) {
      router.replace("/login");
      return;
    }

    if (state === "authenticated" && isAuthRoute) {
      router.replace("/");
    }
  }, [segments, state]);

  if (apiState === "loading" || state === "loading") {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>{apiState === "loading" ? "Starting Network" : "Securing Session"}</Text>
        <Text style={styles.subtitle}>{apiState === "loading" ? apiMessage : message}</Text>
      </View>
    );
  }

  if (apiState === "error") {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Startup Blocked</Text>
        <Text style={styles.subtitle}>{apiMessage}</Text>
        <View style={styles.spacer} />
        <Button
          title="Retry Network Setup"
          onPress={() => {
            setApiState("loading");
            setApiMessage("Preparing offline queue and network client...");
            setInitAttempt((current) => current + 1);
          }}
        />
      </View>
    );
  }

  if (state === "locked") {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Unlock Required</Text>
        <Text style={styles.subtitle}>{message}</Text>
        <View style={styles.spacer} />
        <Button title="Retry Biometric Unlock" onPress={() => void retry()} />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
      </Stack>
      <NetworkStatusBanner />
    </>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "#0f141a",
  },
  title: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 10,
  },
  subtitle: {
    color: "#c7d0da",
    fontSize: 14,
    textAlign: "center",
  },
  spacer: {
    height: 14,
  },
});
