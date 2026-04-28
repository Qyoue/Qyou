import { create } from "zustand";

export type SortField = "distance" | "queueLevel";
export type SortDirection = "asc" | "desc";

type SortState = {
  field: SortField;
  direction: SortDirection;
  setSort: (field: SortField, direction?: SortDirection) => void;
};

const LEVEL_ORDER: Record<string, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
  unknown: 4,
};

export const useSortStore = create<SortState>((set) => ({
  field: "distance",
  direction: "asc",
  setSort: (field, direction = "asc") => set({ field, direction }),
}));

export const sortComparator = (field: SortField, direction: SortDirection) => {
  return (
    a: { distanceFromUser: number; queueSnapshot?: { level?: string } },
    b: { distanceFromUser: number; queueSnapshot?: { level?: string } }
  ) => {
    let diff = 0;
    if (field === "distance") {
      diff = a.distanceFromUser - b.distanceFromUser;
    } else {
      const la = LEVEL_ORDER[a.queueSnapshot?.level ?? "unknown"] ?? 4;
      const lb = LEVEL_ORDER[b.queueSnapshot?.level ?? "unknown"] ?? 4;
      diff = la - lb;
    }
    return direction === "asc" ? diff : -diff;
  };
};
