import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { logoutSession } from "@/src/auth/authClient";

type Section = { label: string; route: string };

const SECTIONS: Section[] = [
  { label: "My Reports", route: "/reports" },
  { label: "Rewards & Balance", route: "/rewards" },
  { label: "Queue Buddy History", route: "/buddies" },
  { label: "Trust & Reputation", route: "/reputation" },
  { label: "Settings", route: "/settings" },
];

export default function ProfileScreen() {
  const handleNav = (route: string) => {
    // Routes are stubs — screens will be added in follow-up issues
    router.push(route as never);
  };

  const handleLogout = () => {
    void logoutSession().finally(() => router.replace("/login"));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar} />
        <Text style={styles.name}>Your Profile</Text>
        <Text style={styles.sub}>Manage your account and activity</Text>
      </View>

      {SECTIONS.map((s) => (
        <Pressable key={s.route} style={styles.row} onPress={() => handleNav(s.route)}>
          <Text style={styles.rowLabel}>{s.label}</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      ))}

      <Pressable style={styles.logout} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  header: { alignItems: "center", marginBottom: 28 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#0f7d5f", marginBottom: 12 },
  name: { fontSize: 20, fontWeight: "700" },
  sub: { fontSize: 13, color: "#666", marginTop: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderColor: "#eee" },
  rowLabel: { fontSize: 15 },
  chevron: { fontSize: 20, color: "#aaa" },
  logout: { marginTop: 32, alignSelf: "center", paddingHorizontal: 28, paddingVertical: 12, borderRadius: 999, backgroundColor: "#183246" },
  logoutText: { color: "#d8ebf8", fontWeight: "700" },
});
