import { useEffect, useMemo, useRef } from "react";
import { Dimensions, PanResponder, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

export type LocationSheetDetails = {
  id: string;
  name: string;
  type: string;
  address: string;
  status?: string;
  distanceFromUser?: number;
  queueSnapshot?: {
    level?: string;
    estimatedWaitMinutes?: number;
    confidence?: number;
    lastUpdatedAt?: string | null;
    isStale?: boolean;
  };
};

type LocationBottomSheetProps = {
  visible: boolean;
  loading: boolean;
  details: LocationSheetDetails | null;
  onDismiss: () => void;
};

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SHEET_HEIGHT = Math.max(Math.round(SCREEN_HEIGHT * 0.9), 420);
const SNAP_90 = 0;
const SNAP_50 = Math.max(SHEET_HEIGHT - SCREEN_HEIGHT * 0.5, 0);
const SNAP_25 = Math.max(SHEET_HEIGHT - SCREEN_HEIGHT * 0.25, 0);
const CLOSE_POSITION = SHEET_HEIGHT + 16;
const SNAP_POINTS = [SNAP_90, SNAP_50, SNAP_25];

const nearestSnap = (value: number) => {
  let best = SNAP_POINTS[0];
  let bestDistance = Math.abs(value - best);
  for (let i = 1; i < SNAP_POINTS.length; i += 1) {
    const candidate = SNAP_POINTS[i];
    const distance = Math.abs(value - candidate);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
};

export function LocationBottomSheet({
  visible,
  loading,
  details,
  onDismiss,
}: LocationBottomSheetProps) {
  const translateY = useSharedValue(CLOSE_POSITION);
  const startYRef = useRef(SNAP_50);
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      startYRef.current = SNAP_50;
      translateY.value = withTiming(SNAP_50, { duration: 220 });
      return;
    }
    startYRef.current = CLOSE_POSITION;
    translateY.value = withTiming(CLOSE_POSITION, { duration: 180 });
  }, [translateY, visible]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onPanResponderGrant: () => {
          startYRef.current = translateY.value;
        },
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 8,
        onPanResponderMove: (_, gesture) => {
          if (!visible) return;
          const next = Math.max(SNAP_90, Math.min(CLOSE_POSITION, startYRef.current + gesture.dy));
          translateY.value = next;
        },
        onPanResponderRelease: (_, gesture) => {
          if (!visible) return;
          const releasePosition = Math.max(
            SNAP_90,
            Math.min(CLOSE_POSITION, startYRef.current + gesture.dy)
          );
          const shouldClose = releasePosition > SNAP_25 + 80;
          if (shouldClose) {
            if (!isClosingRef.current) {
              isClosingRef.current = true;
              onDismiss();
            }
            return;
          }
          const target = nearestSnap(releasePosition);
          startYRef.current = target;
          translateY.value = withTiming(target, { duration: 160 });
        },
      }),
    [onDismiss, translateY, visible]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, animatedStyle]} {...panResponder.panHandlers}>
      <View style={styles.handle} />
      {loading ? (
        <Text style={styles.loadingText}>Loading location details...</Text>
      ) : details ? (
        <View>
          <Text style={styles.title}>{details.name}</Text>
          <Text style={styles.meta}>{details.type}</Text>
          <Text style={styles.row}>{details.address}</Text>
          {typeof details.distanceFromUser === "number" ? (
            <Text style={styles.row}>Distance: {details.distanceFromUser.toFixed(0)} m</Text>
          ) : null}
          {details.status ? <Text style={styles.row}>Status: {details.status}</Text> : null}
          <View style={styles.snapshotCard}>
            <Text style={styles.snapshotTitle}>Live queue signal</Text>
            <Text style={styles.snapshotMetric}>
              Level: {details.queueSnapshot?.level || "unknown"}
            </Text>
            <Text style={styles.snapshotMetric}>
              Wait: {typeof details.queueSnapshot?.estimatedWaitMinutes === "number"
                ? `${details.queueSnapshot.estimatedWaitMinutes} min`
                : "No estimate yet"}
            </Text>
            <Text style={styles.snapshotMetric}>
              Confidence: {typeof details.queueSnapshot?.confidence === "number"
                ? `${Math.round(details.queueSnapshot.confidence * 100)}%`
                : "Unavailable"}
            </Text>
            <Text style={styles.snapshotBadge}>
              {details.queueSnapshot?.isStale ? "Freshness: stale" : "Freshness: active"}
            </Text>
            <Text style={styles.snapshotMeta}>
              {details.queueSnapshot?.lastUpdatedAt
                ? `Updated ${new Date(details.queueSnapshot.lastUpdatedAt).toLocaleTimeString()}`
                : "No recent crowd updates"}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.loadingText}>No location selected.</Text>
      )}
      <Text style={styles.hint}>Swipe down to dismiss</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: "rgba(8, 12, 18, 0.96)",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
  },
  handle: {
    alignSelf: "center",
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#8ea2b5",
    marginBottom: 12,
  },
  loadingText: {
    color: "#cfe0ef",
    fontSize: 14,
    marginTop: 8,
  },
  title: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  meta: {
    color: "#8ec6ff",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  row: {
    color: "#dce7f0",
    fontSize: 14,
    marginBottom: 6,
  },
  snapshotCard: {
    marginTop: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(142, 198, 255, 0.24)",
    backgroundColor: "rgba(14, 22, 31, 0.72)",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  snapshotTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  snapshotMetric: {
    color: "#dce7f0",
    fontSize: 13,
    marginBottom: 4,
    textTransform: "capitalize",
  },
  snapshotBadge: {
    color: "#9fe3ff",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  snapshotMeta: {
    color: "#87a1b8",
    fontSize: 12,
  },
  hint: {
    marginTop: 14,
    color: "#87a1b8",
    fontSize: 12,
  },
});
