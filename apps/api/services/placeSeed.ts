import { Location, LocationDocument, LocationType } from '../models/Location';
import { ValidationError } from '../errors/AppError';
import { logger } from '../logger';

type Provider = 'google' | 'osm';

type BoundingBox = {
  neLat: number;
  neLng: number;
  swLat: number;
  swLng: number;
};

type PlaceSeedRequest = BoundingBox & {
  provider: Provider;
  types: LocationType[];
  radiusInMeters: number;
};

type ExternalPlace = {
  source: 'google_places' | 'openstreetmap';
  placeId: string;
  name: string;
  type: LocationType;
  address: string;
  lat: number;
  lng: number;
};

const GOOGLE_TYPE_MAP: Partial<Record<LocationType, string>> = {
  bank: 'bank',
  hospital: 'hospital',
  atm: 'atm',
  government: 'local_government_office',
  fuel_station: 'gas_station',
};

const OSM_TYPE_MAP: Partial<Record<LocationType, string>> = {
  bank: 'bank',
  hospital: 'hospital',
  atm: 'atm',
  government: 'government',
  fuel_station: 'fuel',
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const average = (a: number, b: number) => (a + b) / 2;

const toNumber = (value: unknown, name: string) => {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    throw new ValidationError(`${name} must be a valid number`);
  }
  return num;
};

const validateBoundingBox = (input: BoundingBox) => {
  const { neLat, neLng, swLat, swLng } = input;
  if (neLat < -90 || neLat > 90 || swLat < -90 || swLat > 90) {
    throw new ValidationError('Latitude must be between -90 and 90');
  }
  if (neLng < -180 || neLng > 180 || swLng < -180 || swLng > 180) {
    throw new ValidationError('Longitude must be between -180 and 180');
  }
  if (neLat <= swLat || neLng <= swLng) {
    throw new ValidationError('Bounding box must have neLat > swLat and neLng > swLng');
  }
};

const normalizeTypes = (input: unknown): LocationType[] => {
  const defaults: LocationType[] = ['bank', 'hospital', 'atm'];
  if (!Array.isArray(input) || input.length === 0) {
    return defaults;
  }

  const allowed: LocationType[] = [
    'bank',
    'hospital',
    'atm',
    'government',
    'fuel_station',
    'other',
  ];

  const normalized = input.map((entry) => String(entry)) as LocationType[];
  if (normalized.some((type) => !allowed.includes(type))) {
    throw new ValidationError(`types must be from: ${allowed.join(', ')}`);
  }

  return Array.from(new Set(normalized));
};

const parseProvider = (value: unknown): Provider => {
  const provider = String(value || 'google').toLowerCase();
  if (provider === 'google' || provider === 'osm') {
    return provider;
  }
  throw new ValidationError('provider must be either "google" or "osm"');
};

const parseSeedRequest = (body: Record<string, unknown>): PlaceSeedRequest => {
  const request: PlaceSeedRequest = {
    neLat: toNumber(body.neLat, 'neLat'),
    neLng: toNumber(body.neLng, 'neLng'),
    swLat: toNumber(body.swLat, 'swLat'),
    swLng: toNumber(body.swLng, 'swLng'),
    provider: parseProvider(body.provider),
    types: normalizeTypes(body.types),
    radiusInMeters: Math.min(Math.max(toNumber(body.radiusInMeters ?? 5000, 'radiusInMeters'), 100), 50000),
  };

  validateBoundingBox(request);
  return request;
};

const seedFromGoogle = async (request: PlaceSeedRequest): Promise<ExternalPlace[]> => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new ValidationError('GOOGLE_PLACES_API_KEY is required when provider="google"');
  }

  const centerLat = average(request.neLat, request.swLat);
  const centerLng = average(request.neLng, request.swLng);
  const places: ExternalPlace[] = [];
  const delayMs = Number(process.env.GOOGLE_PLACES_REQUEST_DELAY_MS || 350);

  for (const type of request.types) {
    const providerType = GOOGLE_TYPE_MAP[type];
    if (!providerType) {
      continue;
    }

    let pageToken: string | null = null;
    let pageCount = 0;

    do {
      const params = new URLSearchParams({
        key: apiKey,
        location: `${centerLat},${centerLng}`,
        radius: String(request.radiusInMeters),
        type: providerType,
      });
      if (pageToken) {
        params.set('pagetoken', pageToken);
      }

      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`,
      );
      if (!response.ok) {
        throw new ValidationError(`Google Places request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as {
        status: string;
        next_page_token?: string;
        error_message?: string;
        results?: Array<{
          place_id: string;
          name?: string;
          vicinity?: string;
          geometry?: { location?: { lat?: number; lng?: number } };
        }>;
      };

      if (payload.status === 'REQUEST_DENIED' || payload.status === 'INVALID_REQUEST') {
        throw new ValidationError(payload.error_message || `Google Places error: ${payload.status}`);
      }

      const results = payload.results || [];
      for (const place of results) {
        if (!place.place_id) continue;
        const lat = Number(place.geometry?.location?.lat);
        const lng = Number(place.geometry?.location?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        places.push({
          source: 'google_places',
          placeId: place.place_id,
          name: place.name || 'Unknown',
          type,
          address: place.vicinity || 'Unknown address',
          lat,
          lng,
        });
      }

      pageToken = payload.next_page_token || null;
      pageCount += 1;

      if (pageToken) {
        await delay(2000);
      }
      await delay(delayMs);
    } while (pageToken && pageCount < 3);
  }

  return places;
};

const seedFromOsm = async (request: PlaceSeedRequest): Promise<ExternalPlace[]> => {
  const places: ExternalPlace[] = [];
  const timeout = Number(process.env.OSM_OVERPASS_TIMEOUT_SECONDS || 25);

  for (const type of request.types) {
    const amenity = OSM_TYPE_MAP[type];
    if (!amenity) continue;

    const query = `
[out:json][timeout:${timeout}];
(
  node["amenity"="${amenity}"](${request.swLat},${request.swLng},${request.neLat},${request.neLng});
  way["amenity"="${amenity}"](${request.swLat},${request.swLng},${request.neLat},${request.neLng});
);
out center tags;
`;

    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: query.trim(),
    });

    if (!response.ok) {
      throw new ValidationError(`OpenStreetMap Overpass request failed with status ${response.status}`);
    }

    const payload = (await response.json()) as {
      elements?: Array<{
        type?: string;
        id?: number;
        lat?: number;
        lon?: number;
        center?: { lat?: number; lon?: number };
        tags?: Record<string, string>;
      }>;
    };

    const elements = payload.elements || [];
    for (const element of elements) {
      const lat = Number(element.lat ?? element.center?.lat);
      const lng = Number(element.lon ?? element.center?.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const id = `${element.type || 'node'}:${element.id || 'unknown'}`;
      const name = element.tags?.name || `OSM ${type}`;
      const street = element.tags?.['addr:street'];
      const city = element.tags?.['addr:city'];
      const address = [street, city].filter(Boolean).join(', ') || 'Unknown address';

      places.push({
        source: 'openstreetmap',
        placeId: id,
        name,
        type,
        address,
        lat,
        lng,
      });
    }

    await delay(300);
  }

  return places;
};

const dedupePlaces = (places: ExternalPlace[]) => {
  const map = new Map<string, ExternalPlace>();
  for (const place of places) {
    map.set(`${place.source}:${place.placeId}`, place);
  }
  return Array.from(map.values());
};

export const seedLocationsFromProvider = async (body: Record<string, unknown>) => {
  const request = parseSeedRequest(body);
  const startedAt = Date.now();

  const fetched =
    request.provider === 'google'
      ? await seedFromGoogle(request)
      : await seedFromOsm(request);

  const places = dedupePlaces(fetched);
  if (places.length === 0) {
    return {
      provider: request.provider,
      fetched: 0,
      inserted: 0,
      updated: 0,
      durationMs: Date.now() - startedAt,
    };
  }

  const operations = places.map((place) => {
    const setData: Partial<LocationDocument> = {
      name: place.name,
      type: place.type,
      address: place.address,
      status: 'active',
      externalSource: place.source,
      externalPlaceId: place.placeId,
      location: {
        type: 'Point',
        coordinates: [place.lng, place.lat],
      },
    };

    return {
      updateOne: {
        filter: {
          externalSource: place.source,
          externalPlaceId: place.placeId,
        },
        update: {
          $set: setData,
        },
        upsert: true,
      },
    };
  });

  const result = await Location.bulkWrite(operations, { ordered: false });
  const inserted = result.upsertedCount || 0;
  const updated = Math.max(0, places.length - inserted);
  const durationMs = Date.now() - startedAt;

  logger.info(
    {
      provider: request.provider,
      fetched: places.length,
      inserted,
      updated,
      durationMs,
    },
    'Location seeding completed',
  );

  return {
    provider: request.provider,
    fetched: places.length,
    inserted,
    updated,
    durationMs,
  };
};
