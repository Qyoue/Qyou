import { BoundingBox, Coordinate } from "./types";

const EARTH_RADIUS_METERS = 6371000;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export const distanceInMeters = (a: Coordinate, b: Coordinate): number => {
  const latDelta = toRadians(b.latitude - a.latitude);
  const lngDelta = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const sinLat = Math.sin(latDelta / 2);
  const sinLng = Math.sin(lngDelta / 2);

  const arc =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;

  const angle = 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
  return EARTH_RADIUS_METERS * angle;
};

export const getBoundingBoxCenter = (bbox: BoundingBox): Coordinate => {
  const north = bbox.northEast.latitude;
  const south = bbox.southWest.latitude;
  const east = bbox.northEast.longitude;
  const west = bbox.southWest.longitude;

  return {
    latitude: (north + south) / 2,
    longitude: (east + west) / 2,
  };
};

export const getBoundingRadiusMeters = (bbox: BoundingBox): number => {
  const center = getBoundingBoxCenter(bbox);
  const corners: Coordinate[] = [
    bbox.northEast,
    bbox.northWest,
    bbox.southEast,
    bbox.southWest,
  ];

  const farthest = corners.reduce((max, corner) => {
    return Math.max(max, distanceInMeters(center, corner));
  }, 0);

  return Math.max(500, Math.ceil(farthest));
};

export const getAreaKey = (bbox: BoundingBox): string => {
  const center = getBoundingBoxCenter(bbox);
  const radius = getBoundingRadiusMeters(bbox);
  const latKey = center.latitude.toFixed(3);
  const lngKey = center.longitude.toFixed(3);
  const radiusKey = Math.round(radius / 100) * 100;
  return `${latKey}:${lngKey}:${radiusKey}`;
};
