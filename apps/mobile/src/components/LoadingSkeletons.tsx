import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";

interface SkeletonBoxProps {
  width?: number | string;
  height?: number;
  style?: ViewStyle;
}

function SkeletonBox({ width = "100%", height = 16, style }: SkeletonBoxProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.box, { width: width as number, height, opacity }, style]}
    />
  );
}

export function MapLoadingSkeleton() {
  return (
    <View style={styles.mapContainer}>
      <SkeletonBox height={220} style={styles.mapBlock} />
      <View style={styles.row}>
        <SkeletonBox width="48%" height={14} />
        <SkeletonBox width="30%" height={14} />
      </View>
    </View>
  );
}

export function LocationDetailSkeleton() {
  return (
    <View style={styles.detailContainer}>
      <SkeletonBox width="60%" height={20} />
      <SkeletonBox height={14} style={{ marginTop: 10 }} />
      <SkeletonBox width="80%" height={14} style={{ marginTop: 6 }} />
      <SkeletonBox width="40%" height={28} style={{ marginTop: 16, borderRadius: 12 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: "#e5e7eb", borderRadius: 6 },
  mapContainer: { padding: 16, gap: 10 },
  mapBlock: { borderRadius: 12 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  detailContainer: { padding: 16, gap: 6 },
});
