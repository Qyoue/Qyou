import { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import MapView, { PROVIDER_GOOGLE, Region } from "react-native-maps";
import { darkMapStyle, lightMapStyle } from "@/src/map/mapStyles";
import { getBoundingBoxFromRegion } from "@/src/map/mapBounds";
import { useMapViewportStore } from "@/src/store/mapViewportStore";

export default function Index() {
  const colorScheme = useColorScheme();
  const setBoundingBox = useMapViewportStore((state) => state.setBoundingBox);
  const boundingBox = useMapViewportStore((state) => state.boundingBox);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      setBoundingBox(getBoundingBoxFromRegion(region));
    }, 500);
  };

  useEffect(() => {
    setBoundingBox(getBoundingBoxFromRegion(initialRegion));

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [setBoundingBox]);

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        onRegionChangeComplete={onRegionChangeComplete}
        customMapStyle={customMapStyle}
      />

      <View style={styles.panel}>
        <Text style={styles.title}>Viewport Sync (Debounced 500ms)</Text>
        <Text style={styles.text}>
          NE: {boundingBox ? `${boundingBox.northEast.latitude.toFixed(5)}, ${boundingBox.northEast.longitude.toFixed(5)}` : "--"}
        </Text>
        <Text style={styles.text}>
          SW: {boundingBox ? `${boundingBox.southWest.latitude.toFixed(5)}, ${boundingBox.southWest.longitude.toFixed(5)}` : "--"}
        </Text>
      </View>
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
});
