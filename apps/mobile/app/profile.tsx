import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { apiClient } from "@/src/network/apiClient";
import { clearStoredSessionTokens, getStoredSessionTokens } from "@/src/auth/secureTokens";

type ProfilePayload = {
  data?: {
    user?: {
      id?: string;
      email?: string;
      role?: string;
    } | null;
    contributionSummary?: {
      reportCount?: number;
      activeSessions?: number;
      rewardBalance?: number;
    };
  };
};

export default function ProfileScreen() {
  const [state, setState] = useState({
    loading: true,
    email: "Not available",
    role: "USER",
    reportCount: 0,
    activeSessions: 0,
    rewardBalance: 0,
    message: "",
  });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const stored = await getStoredSessionTokens();
        if (!stored.accessToken) {
          if (!cancelled) {
            setState((current) => ({
              ...current,
              loading: false,
              message: "Sign in to load your profile summary.",
            }));
          }
          return;
        }

        const response = await apiClient.get("/users/me/profile", {
          headers: {
            Authorization: `Bearer ${stored.accessToken}`,
            ...(stored.deviceId ? { "x-device-id": stored.deviceId } : {}),
          },
        });

        const payload = response.data as ProfilePayload;
        if (cancelled) {
          return;
        }

        setState({
          loading: false,
          email: payload.data?.user?.email || "Unknown user",
          role: payload.data?.user?.role || "USER",
          reportCount: payload.data?.contributionSummary?.reportCount || 0,
          activeSessions: payload.data?.contributionSummary?.activeSessions || 0,
          rewardBalance: payload.data?.contributionSummary?.rewardBalance || 0,
          message: "",
        });
      } catch {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            loading: false,
            message: "Profile endpoint is not available on this backend yet.",
          }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.eyebrow}>Qyou Account</Text>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.email}>{state.email}</Text>
        <Text style={styles.role}>Role: {state.role}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{state.reportCount}</Text>
            <Text style={styles.statLabel}>Reports</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{state.activeSessions}</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{state.rewardBalance}</Text>
            <Text style={styles.statLabel}>Rewards</Text>
          </View>
        </View>

        {state.message ? <Text style={styles.message}>{state.message}</Text> : null}

        <Pressable
          style={styles.button}
          onPress={() => {
            router.replace("/");
          }}
        >
          <Text style={styles.buttonText}>Back to Map</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.buttonSecondary]}
          onPress={() => {
            void clearStoredSessionTokens().finally(() => {
              router.replace("/login");
            });
          }}
        >
          <Text style={styles.buttonText}>Sign Out</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flexGrow: 1,
    backgroundColor: "#08131c",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#1f3a4d",
    backgroundColor: "#122330",
    padding: 24,
  },
  eyebrow: {
    color: "#8ec6ff",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  title: {
    color: "#f4fbff",
    fontSize: 30,
    fontWeight: "800",
  },
  email: {
    color: "#dce7f0",
    fontSize: 15,
    marginTop: 8,
  },
  role: {
    color: "#9fe3ff",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 6,
    marginBottom: 18,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#0b1822",
    padding: 14,
  },
  statValue: {
    color: "#f4fbff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  statLabel: {
    color: "#9eb4c8",
    fontSize: 12,
    textTransform: "uppercase",
  },
  message: {
    color: "#ffb2b2",
    fontSize: 13,
    marginBottom: 16,
  },
  button: {
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: "#9fe3ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  buttonSecondary: {
    backgroundColor: "#183246",
  },
  buttonText: {
    color: "#07131d",
    fontSize: 14,
    fontWeight: "800",
  },
});

