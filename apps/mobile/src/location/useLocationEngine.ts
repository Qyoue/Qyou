import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as Location from "expo-location";
import { prepareBackgroundTracking } from "./backgroundTracking";

export type PermissionStage = "loading" | "needs-education" | "requesting" | "granted" | "denied";
export type AccuracyMode = "full" | "approximate" | "unknown";

const readAccuracyMode = (permission: Location.LocationPermissionResponse): AccuracyMode => {
  const rawAccuracy = (permission as Location.LocationPermissionResponse & { accuracy?: string }).accuracy;
  if (rawAccuracy === "full") return "full";
  if (rawAccuracy === "reduced") return "approximate";
  return "unknown";
};

export const useLocationEngine = () => {
  const [permissionStage, setPermissionStage] = useState<PermissionStage>("loading");
  const [accuracyMode, setAccuracyMode] = useState<AccuracyMode>("unknown");
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [permissionMessage, setPermissionMessage] = useState("Location helps us show the queues around you.");

  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const hasRequestedRef = useRef(false);

  const stopForegroundTracking = useCallback(() => {
    if (watchRef.current) {
      watchRef.current.remove();
      watchRef.current = null;
    }
  }, []);

  const startForegroundTracking = useCallback(async () => {
    stopForegroundTracking();
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 10,
        timeInterval: 5000,
      },
      (nextLocation) => {
        setLocation(nextLocation);
      }
    );
    watchRef.current = subscription;
  }, [stopForegroundTracking]);

  const inspectCurrentPermission = useCallback(async () => {
    const permission = await Location.getForegroundPermissionsAsync();
    setAccuracyMode(readAccuracyMode(permission));

    if (permission.granted) {
      setPermissionStage("granted");
      await startForegroundTracking();
      return;
    }

    if (!permission.canAskAgain || hasRequestedRef.current) {
      setPermissionStage("denied");
      setPermissionMessage("Location was denied. You can enable it in Settings.");
      return;
    }

    setPermissionStage("needs-education");
  }, [startForegroundTracking]);

  useEffect(() => {
    void inspectCurrentPermission();
    return () => {
      stopForegroundTracking();
    };
  }, [inspectCurrentPermission, stopForegroundTracking]);

  const requestForegroundAccess = useCallback(async () => {
    hasRequestedRef.current = true;
    setPermissionStage("requesting");

    const permission = await Location.requestForegroundPermissionsAsync();
    setAccuracyMode(readAccuracyMode(permission));

    if (permission.granted) {
      setPermissionStage("granted");
      await startForegroundTracking();
      return;
    }

    setPermissionStage("denied");
    setPermissionMessage("Location access is required to center map and verify nearby queue presence.");
  }, [startForegroundTracking]);

  const backgroundTrackingPreparation = useMemo(() => prepareBackgroundTracking(), []);

  return {
    permissionStage,
    accuracyMode,
    location,
    permissionMessage,
    requestForegroundAccess,
    retryPermissionFlow: inspectCurrentPermission,
    backgroundTrackingPreparation,
  };
};
