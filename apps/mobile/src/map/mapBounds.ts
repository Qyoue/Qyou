import { Region } from "react-native-maps";
import { BoundingBox } from "./types";

export const getBoundingBoxFromRegion = (region: Region): BoundingBox => {
  const halfLat = region.latitudeDelta / 2;
  const halfLng = region.longitudeDelta / 2;

  const north = region.latitude + halfLat;
  const south = region.latitude - halfLat;
  const east = region.longitude + halfLng;
  const west = region.longitude - halfLng;

  return {
    northEast: { latitude: north, longitude: east },
    northWest: { latitude: north, longitude: west },
    southEast: { latitude: south, longitude: east },
    southWest: { latitude: south, longitude: west },
  };
};
