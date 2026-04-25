/**
 * MapScreenModules – route and feature module registry for the map screen.
 * Keeps apps/mobile/app/index.tsx thin by declaring each sub-concern here.
 * Issue #172
 */

export type MapFeatureModule =
  | "location-engine"
  | "bounding-box-polling"
  | "cluster-renderer"
  | "bottom-sheet"
  | "network-banner";

export type MapRouteModule = "index" | "location-detail" | "report";

export interface ModuleDescriptor {
  id: MapFeatureModule | MapRouteModule;
  lazy: boolean;
  requiresAuth: boolean;
  requiresLocation: boolean;
}

const FEATURE_MODULES: ModuleDescriptor[] = [
  { id: "location-engine",      lazy: false, requiresAuth: false, requiresLocation: false },
  { id: "bounding-box-polling", lazy: false, requiresAuth: false, requiresLocation: true  },
  { id: "cluster-renderer",     lazy: true,  requiresAuth: false, requiresLocation: true  },
  { id: "bottom-sheet",         lazy: true,  requiresAuth: false, requiresLocation: false },
  { id: "network-banner",       lazy: false, requiresAuth: false, requiresLocation: false },
];

const ROUTE_MODULES: ModuleDescriptor[] = [
  { id: "index",           lazy: false, requiresAuth: false, requiresLocation: false },
  { id: "location-detail", lazy: true,  requiresAuth: false, requiresLocation: false },
  { id: "report",          lazy: true,  requiresAuth: true,  requiresLocation: true  },
];

export const getAllModules = (): ModuleDescriptor[] => [
  ...FEATURE_MODULES,
  ...ROUTE_MODULES,
];

export const getModulesRequiringLocation = (): ModuleDescriptor[] =>
  getAllModules().filter((m) => m.requiresLocation);

export const getModulesRequiringAuth = (): ModuleDescriptor[] =>
  getAllModules().filter((m) => m.requiresAuth);

export const findModule = (
  id: MapFeatureModule | MapRouteModule
): ModuleDescriptor | undefined => getAllModules().find((m) => m.id === id);
