import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { apiClient } from "@/src/network/apiClient";
import { getStoredSessionTokens } from "@/src/auth/secureTokens";

export type LocationSheetDetails = {
  id: string;
  name: string;
  type: string;
  address: string;
  status?: string;
  distanceFromUser?: number;
};

type LocationBottomSheetProps = {
  visible: boolean;
  loading: boolean;
  details: LocationSheetDetails | null;
  onDismiss: () => void;
  onReportSubmitted?: () => void;
};

const REPORT_LEVELS = ["none", "low", "medium", "high", "unknown"] as const;
type ReportLevel = (typeof REPORT_LEVELS)[number];

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
  onReportSubmitted,
}: LocationBottomSheetProps) {
  const translateY = useSharedValue(CLOSE_POSITION);
  const startYRef = useRef(SNAP_50);
  const isClosingRef = useRef(false);
  const [waitTimeMinutes, setWaitTimeMinutes] = useState("");
  const [level, setLevel] = useState<ReportLevel>("medium");
  const [notes, setNotes] = useState("");
  const [reportState, setReportState] = useState<{
    status: "idle" | "submitting" | "success" | "error";
    message: string;
  }>({
    status: "idle",
    message: "",
  });

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

  useEffect(() => {
    if (!visible || !details?.id) {
      return;
    }

    setWaitTimeMinutes("");
    setLevel("medium");
    setNotes("");
    setReportState({
      status: "idle",
      message: "",
    });
  }, [details?.id, visible]);

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

  const handleSubmitReport = async () => {
    if (!details?.id) {
      return;
    }

    const stored = await getStoredSessionTokens();
    if (!stored.accessToken) {
      setReportState({
        status: "error",
        message: "Sign in support has not been configured on this build yet.",
      });
      return;
    }

    const parsedWait = waitTimeMinutes.trim() ? Number(waitTimeMinutes.trim()) : undefined;
    if (parsedWait !== undefined && (!Number.isFinite(parsedWait) || parsedWait < 0)) {
      setReportState({
        status: "error",
        message: "Wait time must be a valid positive number.",
      });
      return;
    }

    setReportState({
      status: "submitting",
      message: "",
    });

    try {
      await apiClient.post(
        "/queues/report",
        {
          locationId: details.id,
          waitTimeMinutes: parsedWait,
          level,
          notes: notes.trim() || undefined,
        },
        {
          headers: {
            Authorization: `Bearer ${stored.accessToken}`,
            ...(stored.deviceId ? { "x-device-id": stored.deviceId } : {}),
          },
        }
      );

      setReportState({
        status: "success",
        message: "Queue report submitted.",
      });
      onReportSubmitted?.();
    } catch (error) {
      const status = typeof error === "object" && error && "response" in error
        ? (error as { response?: { status?: number } }).response?.status
        : undefined;

      const message =
        status === 401
          ? "Your session is not authorized for reporting yet."
          : status === 404
            ? "Reporting endpoint is not available on this backend yet."
            : error instanceof Error
              ? error.message
              : "Unable to submit queue report right now.";

      setReportState({
        status: "error",
        message,
      });
    }
  };

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

          <View style={styles.reportSection}>
            <Text style={styles.sectionTitle}>Report current queue</Text>
            <Text style={styles.sectionCopy}>
              Send a live queue update for this location. If the backend route is not deployed yet, this form will fail safely.
            </Text>

            <TextInput
              keyboardType="numeric"
              onChangeText={setWaitTimeMinutes}
              placeholder="Wait time in minutes (optional)"
              placeholderTextColor="#7890a5"
              style={styles.input}
              value={waitTimeMinutes}
            />

            <View style={styles.levelRow}>
              {REPORT_LEVELS.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setLevel(item)}
                  style={[styles.levelChip, level === item ? styles.levelChipActive : null]}
                >
                  <Text style={[styles.levelChipText, level === item ? styles.levelChipTextActive : null]}>
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              multiline
              onChangeText={setNotes}
              placeholder="Optional note"
              placeholderTextColor="#7890a5"
              style={[styles.input, styles.notesInput]}
              value={notes}
            />

            {reportState.message ? (
              <Text
                style={[
                  styles.reportMessage,
                  reportState.status === "error" ? styles.reportMessageError : styles.reportMessageSuccess,
                ]}
              >
                {reportState.message}
              </Text>
            ) : null}

            <Pressable
              disabled={reportState.status === "submitting"}
              onPress={() => {
                void handleSubmitReport();
              }}
              style={styles.submitButton}
            >
              {reportState.status === "submitting" ? (
                <ActivityIndicator color="#08131c" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Report</Text>
              )}
            </Pressable>
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
  reportSection: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(151, 176, 198, 0.18)",
  },
  sectionTitle: {
    color: "#f4fbff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  sectionCopy: {
    color: "#9eb4c8",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  input: {
    backgroundColor: "#0b1620",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#233544",
    color: "#f4fbff",
    fontSize: 14,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  notesInput: {
    minHeight: 82,
    textAlignVertical: "top",
  },
  levelRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  levelChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#294151",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  levelChipActive: {
    backgroundColor: "#9fe3ff",
    borderColor: "#9fe3ff",
  },
  levelChipText: {
    color: "#d0dfeb",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  levelChipTextActive: {
    color: "#07131d",
  },
  reportMessage: {
    fontSize: 12,
    marginBottom: 10,
  },
  reportMessageError: {
    color: "#ff9797",
  },
  reportMessageSuccess: {
    color: "#9ce6ba",
  },
  submitButton: {
    minHeight: 46,
    backgroundColor: "#9fe3ff",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    color: "#08131c",
    fontSize: 14,
    fontWeight: "800",
  },
  hint: {
    marginTop: 14,
    color: "#87a1b8",
    fontSize: 12,
  },
});
