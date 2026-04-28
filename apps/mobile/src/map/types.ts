export type Coordinate = {
  latitude: number;
  longitude: number;
};

export type BoundingBox = {
  northEast: Coordinate;
  northWest: Coordinate;
  southEast: Coordinate;
  southWest: Coordinate;
};
