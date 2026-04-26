import { create } from "zustand";
import { Coordinate } from "../map/types";

const MAX_LOCATION_CACHE = 1500;
const MAX_AREA_KEYS = 250;

export type NearbyLocation = {
  id: string;
  name: string;
  type: string;
  address: string;
  distanceFromUser: number;
  coordinate: Coordinate;
};

type LocationsState = {
  locationsById: Record<string, NearbyLocation>;
  orderedIds: string[];
  lastFetchedCenter: Coordinate | null;
  lastPollAt: number | null;
  isPolling: boolean;
  fetchedAreaKeys: string[];
  mergeLocations: (items: NearbyLocation[]) => void;
  setPolling: (value: boolean) => void;
  markPolled: (center: Coordinate) => void;
  hasFetchedArea: (key: string) => boolean;
  markFetchedArea: (key: string) => void;
};

export const useLocationsStore = create<LocationsState>((set, get) => ({
  locationsById: {},
  orderedIds: [],
  lastFetchedCenter: null,
  lastPollAt: null,
  isPolling: false,
  fetchedAreaKeys: [],
  mergeLocations: (items) =>
    set((state) => {
      const nextById = { ...state.locationsById };
      const nextOrdered = [...state.orderedIds];

      for (const item of items) {
        if (!nextById[item.id]) {
          nextOrdered.push(item.id);
        }
        nextById[item.id] = item;
      }

      if (nextOrdered.length > MAX_LOCATION_CACHE) {
        const trimCount = nextOrdered.length - MAX_LOCATION_CACHE;
        const trimmedIds = nextOrdered.splice(0, trimCount);
        for (const id of trimmedIds) {
          delete nextById[id];
        }
      }

      return {
        locationsById: nextById,
        orderedIds: nextOrdered,
      };
    }),
  setPolling: (value) => set({ isPolling: value }),
  markPolled: (center) =>
    set({
      lastFetchedCenter: center,
      lastPollAt: Date.now(),
    }),
  hasFetchedArea: (key) => get().fetchedAreaKeys.includes(key),
  markFetchedArea: (key) =>
    set((state) => {
      if (state.fetchedAreaKeys.includes(key)) {
        return state;
      }

      const next = [...state.fetchedAreaKeys, key];
      if (next.length > MAX_AREA_KEYS) {
        next.splice(0, next.length - MAX_AREA_KEYS);
      }

      return { fetchedAreaKeys: next };
    }),
}));
