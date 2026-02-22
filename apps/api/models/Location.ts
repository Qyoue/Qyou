import { Model, Schema, model, models } from 'mongoose';

export type LocationStatus = 'active' | 'inactive';
export type LocationType =
  | 'bank'
  | 'hospital'
  | 'atm'
  | 'government'
  | 'fuel_station'
  | 'other';

export interface LocationDocument {
  name: string;
  type: LocationType;
  address: string;
  status: LocationStatus;
  externalSource?: 'google_places' | 'openstreetmap';
  externalPlaceId?: string;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
}

const locationSchema = new Schema<LocationDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    type: {
      type: String,
      required: true,
      enum: ['bank', 'hospital', 'atm', 'government', 'fuel_station', 'other'],
    },
    address: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 300,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      required: true,
    },
    externalSource: {
      type: String,
      enum: ['google_places', 'openstreetmap'],
    },
    externalPlaceId: {
      type: String,
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
        validate: [
          {
            validator: (coords: number[]) => Array.isArray(coords) && coords.length === 2,
            message: 'Location coordinates must be [lng, lat]',
          },
          {
            validator: (coords: number[]) => {
              if (!Array.isArray(coords) || coords.length !== 2) return false;
              const [lng, lat] = coords;
              return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
            },
            message: 'Invalid GeoJSON coordinates: lng must be [-180,180] and lat must be [-90,90]',
          },
        ],
      },
    },
  },
  {
    timestamps: true,
  },
);

locationSchema.index({ location: '2dsphere' });
locationSchema.index(
  { externalSource: 1, externalPlaceId: 1 },
  { unique: true, sparse: true, name: 'source_place_unique' },
);

export const Location =
  (models.Location as Model<LocationDocument>) ||
  model<LocationDocument>('Location', locationSchema);

export const ensureLocationIndexes = async () => {
  await Location.syncIndexes();
};
