import { Stack, router, usePathname } from "expo-router";
import { useEffect } from "react";
import { initializeApiClient, shutdownApiClient } from "@/src/network/apiClient";
import { Button, StyleSheet, Text, View } from "react-native";
import { useSessionBootstrap } from "@/src/auth/useSessionBootstrap";

export default function RootLayout() {
  const { state, message, retry } = useSessionBootstrap();
  const pathname = usePathname();

  useEffect(() => {
    void initializeApiClient();
    return () => {
      shutdownApiClient();
    };
  }, []);

  useEffect(() => {
    if (state === "loading" || state === "locked") {
      return;
    }

    const isAuthRoute = pathname === "/login" || pathname === "/register";

    if (state === "unauthenticated" && !isAuthRoute) {
      router.replace("/login");
      return;
    }

    if (state === "authenticated" && isAuthRoute) {
      router.replace("/");
    }
  }, [pathname, state]);

  if (state === "loading") {
    return (
      <View style={styles.centered}>
        <Text style={styles.title}>Securing Session</Text>
        <Text style={styles.subtitle}>{message}</Text>
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
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
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
