import { create } from "zustand";
import type { LocationType } from "@qyou/types";

export type RadiusOption = 500 | 1000 | 2000 | 5000;

type FilterState = {
  locationType: LocationType | null;
  radius: RadiusOption;
  setLocationType: (t: LocationType | null) => void;
  setRadius: (r: RadiusOption) => void;
};

export const useFilterStore = create<FilterState>((set) => ({
  locationType: null,
  radius: 2000,
  setLocationType: (locationType) => set({ locationType }),
  setRadius: (radius) => set({ radius }),
}));
