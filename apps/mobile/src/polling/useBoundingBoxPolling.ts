import { useEffect } from "react";
import { useMapViewportStore } from "../store/mapViewportStore";
import { useLocationsStore } from "../store/locationsStore";
import { getAreaKey, getBoundingBoxCenter, getBoundingRadiusMeters, distanceInMeters } from "../map/geo";
import { apiClient } from "../network/apiClient";

const MIN_MOVEMENT_METERS = 500;
const POLL_INTERVAL_MS = 12000;

type NearbyResponseItem = {
  _id: string;
  name: string;
  type: string;
  address: string;
  distanceFromUser: number;
  location: {
    coordinates: [number, number];
  };
};

type NearbyResponse = {
  data?: {
    items?: NearbyResponseItem[];
  };
};

export const useBoundingBoxPolling = () => {
  const boundingBox = useMapViewportStore((state) => state.boundingBox);
  const lastFetchedCenter = useLocationsStore((state) => state.lastFetchedCenter);
  const setPolling = useLocationsStore((state) => state.setPolling);
  const mergeLocations = useLocationsStore((state) => state.mergeLocations);
  const markPolled = useLocationsStore((state) => state.markPolled);
  const hasFetchedArea = useLocationsStore((state) => state.hasFetchedArea);
  const markFetchedArea = useLocationsStore((state) => state.markFetchedArea);

  useEffect(() => {
    if (!boundingBox) {
      return;
    }

    let timer: ReturnType<typeof setInterval> | null = null;
    let stopped = false;

    const poll = async () => {
      if (stopped) {
        return;
      }

      const center = getBoundingBoxCenter(boundingBox);
      const areaKey = getAreaKey(boundingBox);
      const radius = getBoundingRadiusMeters(boundingBox);

      if (hasFetchedArea(areaKey)) {
        return;
      }

      if (lastFetchedCenter) {
        const movedMeters = distanceInMeters(lastFetchedCenter, center);
        if (movedMeters <= MIN_MOVEMENT_METERS) {
          return;
        }
      }

      setPolling(true);
      try {
        const response = await apiClient.get("/locations/nearby", {
          params: {
            lat: center.latitude,
            lng: center.longitude,
            radiusInMeters: radius,
            limit: 200,
          },
        });

        const payload = response.data as NearbyResponse;
        const items = payload.data?.items || [];
        const normalized = items
          .filter((item) => {
            return (
              item &&
              Array.isArray(item.location?.coordinates) &&
              item.location.coordinates.length === 2
            );
          })
          .map((item) => ({
            id: item._id,
            name: item.name,
            type: item.type,
            address: item.address,
            distanceFromUser: item.distanceFromUser,
            coordinate: {
              latitude: item.location.coordinates[1],
              longitude: item.location.coordinates[0],
            },
          }));

        mergeLocations(normalized);
        markPolled(center);
        markFetchedArea(areaKey);
      } catch {
        // Silence polling errors to avoid blocking map interactions.
      } finally {
        setPolling(false);
      }
    };

    void poll();
    timer = setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    return () => {
      stopped = true;
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [
    boundingBox,
    hasFetchedArea,
    lastFetchedCenter,
    markFetchedArea,
    markPolled,
    mergeLocations,
    setPolling,
  ]);
};
