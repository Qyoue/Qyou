import React from "react";
import { View, Text, StyleSheet } from "react-native";

type QueueLevel = "low" | "moderate" | "high" | "unknown";

interface QueueStatusBadgeProps {
  level: QueueLevel;
  waitMinutes?: number;
  reportedAt?: string;
}

const LEVEL_CONFIG: Record<QueueLevel, { color: string; label: string }> = {
  low: { color: "#22c55e", label: "Low" },
  moderate: { color: "#f59e0b", label: "Moderate" },
  high: { color: "#ef4444", label: "High" },
  unknown: { color: "#9ca3af", label: "Unknown" },
};

function getFreshness(reportedAt?: string): string {
  if (!reportedAt) return "";
  const diffMs = Date.now() - new Date(reportedAt).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function QueueStatusBadge({ level, waitMinutes, reportedAt }: QueueStatusBadgeProps) {
  const config = LEVEL_CONFIG[level] ?? LEVEL_CONFIG.unknown;
  const freshness = getFreshness(reportedAt);

  return (
    <View style={[styles.badge, { backgroundColor: config.color }]}>
      <Text style={styles.label}>{config.label}</Text>
      {waitMinutes != null && (
        <Text style={styles.wait}>~{waitMinutes} min</Text>
      )}
      {freshness ? <Text style={styles.freshness}>{freshness}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  label: { color: "#fff", fontWeight: "600", fontSize: 12 },
  wait: { color: "#fff", fontSize: 12 },
  freshness: { color: "rgba(255,255,255,0.8)", fontSize: 11 },
});
