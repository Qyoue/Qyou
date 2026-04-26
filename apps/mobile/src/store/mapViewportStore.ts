import { create } from "zustand";
import { BoundingBox } from "../map/types";

type MapViewportState = {
  boundingBox: BoundingBox | null;
  lastUpdatedAt: number | null;
  setBoundingBox: (boundingBox: BoundingBox) => void;
};

export const useMapViewportStore = create<MapViewportState>((set) => ({
  boundingBox: null,
  lastUpdatedAt: null,
  setBoundingBox: (boundingBox) =>
    set({
      boundingBox,
      lastUpdatedAt: Date.now(),
    }),
}));
