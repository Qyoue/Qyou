import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Linking, StyleSheet, Text, View, useColorScheme } from "react-native";
import MapView, { Marker, Region } from "react-native-maps";
import { darkMapStyle, lightMapStyle } from "@/src/map/mapStyles";
import { getBoundingBoxFromRegion } from "@/src/map/mapBounds";
import { useMapViewportStore } from "@/src/store/mapViewportStore";
import { useLocationEngine } from "@/src/location/useLocationEngine";
import { useBoundingBoxPolling } from "@/src/polling/useBoundingBoxPolling";
import { useLocationsStore } from "@/src/store/locationsStore";
import { getExpansionRegionForCluster, useMapClusters } from "@/src/map/useMapClusters";
import { apiClient } from "@/src/network/apiClient";
import { LocationBottomSheet, LocationSheetDetails } from "@/src/map/LocationBottomSheet";

type LocationDetailsResponse = {
  data?: {
    item?: {
      _id?: string;
      name?: string;
      type?: string;
      address?: string;
      status?: string;
    };
  };
};

export default function Index() {
  const colorScheme = useColorScheme();
  const setBoundingBox = useMapViewportStore((state) => state.setBoundingBox);
  const boundingBox = useMapViewportStore((state) => state.boundingBox);
  const {
    permissionStage,
    accuracyMode,
    location,
    permissionMessage,
    requestForegroundAccess,
    retryPermissionFlow,
    backgroundTrackingPreparation,
  } = useLocationEngine();
  useBoundingBoxPolling();

  const orderedIds = useLocationsStore((state) => state.orderedIds);
  const locationsById = useLocationsStore((state) => state.locationsById);
  const isPolling = useLocationsStore((state) => state.isPolling);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const hasCenteredOnUser = useRef(false);
  const currentRegionRef = useRef<Region | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedDetails, setSelectedDetails] = useState<LocationSheetDetails | null>(null);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [detailsRefreshKey, setDetailsRefreshKey] = useState(0);

  const customMapStyle = useMemo(
    () => (colorScheme === "dark" ? darkMapStyle : lightMapStyle),
    [colorScheme]
  );

  const initialRegion: Region = {
    latitude: 6.5244,
    longitude: 3.3792,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };

  const onRegionChangeComplete = (region: Region) => {
    currentRegionRef.current = region;
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      setBoundingBox(getBoundingBoxFromRegion(region));
    }, 500);
  };

  useEffect(() => {
    currentRegionRef.current = initialRegion;
    setBoundingBox(getBoundingBoxFromRegion(initialRegion));

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [setBoundingBox]);

  useEffect(() => {
    if (!location || hasCenteredOnUser.current) {
      return;
    }

    hasCenteredOnUser.current = true;
    mapRef.current?.animateToRegion(
      {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      },
      700
    );
  }, [location]);

  const clusters = useMapClusters(currentRegionRef.current, orderedIds, locationsById);

  useEffect(() => {
    if (!selectedLocationId) {
      setSelectedDetails(null);
      setIsDetailsLoading(false);
      return;
    }

    let cancelled = false;
    const fallback = locationsById[selectedLocationId];

    setIsDetailsLoading(true);
    void (async () => {
      try {
        const response = await apiClient.get(`/locations/${selectedLocationId}`);
        const payload = response.data as LocationDetailsResponse;
        const item = payload.data?.item;
        if (cancelled) return;

        if (item?._id) {
          setSelectedDetails({
            id: item._id,
            name: item.name || fallback?.name || "Location",
            type: item.type || fallback?.type || "unknown",
            address: item.address || fallback?.address || "No address available",
            status: item.status,
            distanceFromUser: fallback?.distanceFromUser,
          });
          return;
        }
      } catch {
        // Fallback to local cached map item.
      }

      if (!cancelled && fallback) {
        setSelectedDetails({
          id: fallback.id,
          name: fallback.name,
          type: fallback.type,
          address: fallback.address,
          distanceFromUser: fallback.distanceFromUser,
        });
      }
    })().finally(() => {
      if (!cancelled) {
        setIsDetailsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [detailsRefreshKey, locationsById, selectedLocationId]);
  return (
    <View style={styles.container}>
      <MapView
        ref={(ref) => {
          mapRef.current = ref;
        }}
        style={styles.map}
        initialRegion={initialRegion}
        onRegionChangeComplete={onRegionChangeComplete}
        customMapStyle={customMapStyle}
        showsUserLocation={permissionStage === "granted"}
        showsMyLocationButton
      >
        {clusters.map((item) =>
          item.isCluster ? (
            <Marker
              key={item.id}
              coordinate={item.coordinate}
              onPress={() => {
                const expansion = getExpansionRegionForCluster(
                  item,
                  currentRegionRef.current || initialRegion
                );
                mapRef.current?.animateToRegion(expansion, 400);
              }}
            >
              <View style={styles.clusterBubble}>
                <Text style={styles.clusterText}>{item.pointCount}</Text>
              </View>
            </Marker>
          ) : (
            <Marker
              key={item.id}
              coordinate={item.coordinate}
              title={item.title}
              description={item.description}
              onPress={() => {
                const targetId = item.pointIds[0];
                if (targetId) {
                  setSelectedLocationId(targetId);
                }
              }}
            />
          )
        )}
      </MapView>

      <View style={styles.panel}>
        <Text style={styles.title}>Viewport + Location Engine</Text>
        <Text style={styles.text}>
          NE: {boundingBox ? `${boundingBox.northEast.latitude.toFixed(5)}, ${boundingBox.northEast.longitude.toFixed(5)}` : "--"}
        </Text>
        <Text style={styles.text}>
          SW: {boundingBox ? `${boundingBox.southWest.latitude.toFixed(5)}, ${boundingBox.southWest.longitude.toFixed(5)}` : "--"}
        </Text>
        <Text style={styles.text}>Permission: {permissionStage}</Text>
        <Text style={styles.text}>Accuracy: {accuracyMode}</Text>
        <Text style={styles.text}>Polling: {isPolling ? "fetching" : "idle"}</Text>
        <Text style={styles.text}>Cached locations: {orderedIds.length}</Text>
        <Text style={styles.text}>Rendered markers: {clusters.length}</Text>
        <Text style={styles.text}>
          Background hook: {backgroundTrackingPreparation.ready ? "ready" : "prepared"} ({backgroundTrackingPreparation.taskName})
        </Text>
      </View>

      {(permissionStage === "needs-education" || permissionStage === "requesting") && (
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Enable Location</Text>
          <Text style={styles.modalText}>
            We use location to center your map, show queues near you, and support future proof-of-queue verification.
          </Text>
          <Button
            title={permissionStage === "requesting" ? "Requesting..." : "Continue to OS Permission"}
            onPress={() => {
              void requestForegroundAccess();
            }}
            disabled={permissionStage === "requesting"}
          />
        </View>
      )}

      {permissionStage === "denied" && (
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Location Unavailable</Text>
          <Text style={styles.modalText}>{permissionMessage}</Text>
          <View style={styles.buttonSpacer} />
          <Button title="Retry Permission Check" onPress={() => void retryPermissionFlow()} />
          <View style={styles.buttonSpacer} />
          <Button title="Open Settings" onPress={() => void Linking.openSettings()} />
        </View>
      )}

      {permissionStage === "granted" && accuracyMode === "approximate" && (
        <View style={styles.warning}>
          <Text style={styles.warningText}>
            Approximate location is enabled. Nearby queue precision may be reduced.
          </Text>
        </View>
      )}

      <LocationBottomSheet
        visible={Boolean(selectedLocationId)}
        loading={isDetailsLoading}
        details={selectedDetails}
        onReportSubmitted={() => {
          setDetailsRefreshKey((current) => current + 1);
        }}
        onDismiss={() => {
          setSelectedLocationId(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  panel: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 24,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  title: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 6,
  },
  text: {
    color: "#dce3ea",
    fontSize: 12,
  },
  modal: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 80,
    borderRadius: 14,
    backgroundColor: "rgba(8, 12, 18, 0.9)",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
  },
  modalText: {
    color: "#d8dee6",
    fontSize: 13,
    marginBottom: 10,
  },
  buttonSpacer: {
    height: 8,
  },
  warning: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 30,
    borderRadius: 10,
    backgroundColor: "rgba(187, 118, 13, 0.92)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  warningText: {
    color: "#fff7e2",
    fontSize: 12,
    fontWeight: "600",
  },
  clusterBubble: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#0f7d5f",
    borderWidth: 2,
    borderColor: "#d6f7ec",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  clusterText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12,
  },
});
