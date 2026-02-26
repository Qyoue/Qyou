import { useMemo } from "react";
import { Region } from "react-native-maps";
import { NearbyLocation } from "../store/locationsStore";

export type MapClusterPoint = {
  id: string;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  title: string;
  description: string;
};

export type MapCluster = {
  id: string;
  isCluster: boolean;
  coordinate: {
    latitude: number;
    longitude: number;
  };
  pointCount: number;
  pointIds: string[];
  leaves: MapClusterPoint[];
  title: string;
  description?: string;
};

const toZoomLevel = (region: Region) => {
  const zoom = Math.log2(360 / Math.max(region.longitudeDelta, 0.00001));
  return Math.max(1, Math.min(20, Math.round(zoom)));
};

export const getExpansionRegionForCluster = (cluster: MapCluster, fallback: Region): Region => {
  if (!cluster.isCluster || cluster.leaves.length <= 1) {
    return fallback;
  }

  let minLat = Number.POSITIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;
  let minLng = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;

  for (const point of cluster.leaves) {
    minLat = Math.min(minLat, point.coordinate.latitude);
    maxLat = Math.max(maxLat, point.coordinate.latitude);
    minLng = Math.min(minLng, point.coordinate.longitude);
    maxLng = Math.max(maxLng, point.coordinate.longitude);
  }

  const latDelta = Math.max((maxLat - minLat) * 1.6, 0.01);
  const lngDelta = Math.max((maxLng - minLng) * 1.6, 0.01);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
};

export const useMapClusters = (
  region: Region | null,
  orderedIds: string[],
  locationsById: Record<string, NearbyLocation>
): MapCluster[] => {
  return useMemo(() => {
    if (!region) {
      const points: MapCluster[] = [];
      for (const id of orderedIds) {
        const locationItem = locationsById[id];
        if (!locationItem) continue;

        points.push({
          id: locationItem.id,
          isCluster: false,
          coordinate: locationItem.coordinate,
          pointCount: 1,
          pointIds: [locationItem.id],
          leaves: [
            {
              id: locationItem.id,
              coordinate: locationItem.coordinate,
              title: locationItem.name,
              description: `${locationItem.type} • ${locationItem.address}`,
            },
          ],
          title: locationItem.name,
          description: `${locationItem.type} • ${locationItem.address}`,
        });
      }
      return points;
    }

    const zoomLevel = toZoomLevel(region);
    const clusterRadiusLng = Math.max(region.longitudeDelta / (zoomLevel < 10 ? 8 : 14), 0.0004);
    const clusterRadiusLat = Math.max(region.latitudeDelta / (zoomLevel < 10 ? 8 : 14), 0.0004);

    const buckets = new Map<string, NearbyLocation[]>();

    for (const id of orderedIds) {
      const locationItem = locationsById[id];
      if (!locationItem) continue;

      const x = Math.floor((locationItem.coordinate.longitude + 180) / clusterRadiusLng);
      const y = Math.floor((locationItem.coordinate.latitude + 90) / clusterRadiusLat);
      const key = `${x}:${y}`;

      const bucket = buckets.get(key);
      if (!bucket) {
        buckets.set(key, [locationItem]);
      } else {
        bucket.push(locationItem);
      }
    }

    const clusters: MapCluster[] = [];
    for (const group of buckets.values()) {
      if (group.length === 1) {
        const point = group[0];
        clusters.push({
          id: point.id,
          isCluster: false,
          coordinate: point.coordinate,
          pointCount: 1,
          pointIds: [point.id],
          leaves: [
            {
              id: point.id,
              coordinate: point.coordinate,
              title: point.name,
              description: `${point.type} • ${point.address}`,
            },
          ],
          title: point.name,
          description: `${point.type} • ${point.address}`,
        });
        continue;
      }

      const center = group.reduce(
        (acc, item) => {
          acc.latitude += item.coordinate.latitude;
          acc.longitude += item.coordinate.longitude;
          return acc;
        },
        { latitude: 0, longitude: 0 }
      );

      const coordinate = {
        latitude: center.latitude / group.length,
        longitude: center.longitude / group.length,
      };

      clusters.push({
        id: `cluster:${group.map((entry) => entry.id).join(",")}`,
        isCluster: true,
        coordinate,
        pointCount: group.length,
        pointIds: group.map((entry) => entry.id),
        leaves: group.map((entry) => ({
          id: entry.id,
          coordinate: entry.coordinate,
          title: entry.name,
          description: `${entry.type} • ${entry.address}`,
        })),
        title: `${group.length} locations`,
      });
    }

    return clusters;
  }, [region, orderedIds, locationsById]);
};
