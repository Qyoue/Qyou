import { logger } from '../logger';
import { LocationDocument } from '../models/Location';

type RedisClient = {
  isReady?: boolean;
  connect: () => Promise<void>;
  quit: () => Promise<void>;
  sendCommand: (args: string[]) => Promise<unknown>;
  mGet: (keys: string[]) => Promise<Array<string | null>>;
  setEx: (key: string, seconds: number, value: string) => Promise<unknown>;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
};

type CachedLocation = {
  id: string;
  name: string;
  type: LocationDocument['type'];
  address: string;
  status: LocationDocument['status'];
  location: LocationDocument['location'];
};

type NearbyQuery = {
  lng: number;
  lat: number;
  radiusInMeters: number;
  limit: number;
  typeFilter?: LocationDocument['type'];
};

type NearbyResult = CachedLocation & {
  distanceFromUser: number;
};

const GEO_KEY = 'locations:geo:active';
const DOC_KEY_PREFIX = 'locations:doc:';
const DOC_TTL_SECONDS = 7 * 24 * 60 * 60;
const CACHE_CANDIDATE_MULTIPLIER = 3;

let clientPromise: Promise<RedisClient | null> | null = null;

const getDocKey = (id: string) => `${DOC_KEY_PREFIX}${id}`;

const safeParseJson = <T>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
};

const loadRedisModule = async (): Promise<{
  createClient: (opts: { url: string }) => RedisClient;
} | null> => {
  try {
    const redis = require('redis') as {
      createClient: (opts: { url: string }) => RedisClient;
    };
    return redis;
  } catch {
    logger.warn('redis package not installed; location cache disabled');
    return null;
  }
};

const createClientIfEnabled = async (): Promise<RedisClient | null> => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    logger.info('REDIS_URL missing; location cache disabled');
    return null;
  }

  const redis = await loadRedisModule();
  if (!redis) {
    return null;
  }

  const client = redis.createClient({ url: redisUrl });
  client.on('error', (err) => {
    logger.warn({ err }, 'Redis client error; falling back to MongoDB');
  });

  try {
    await client.connect();
    logger.info('Redis location cache connected');
    return client;
  } catch (error) {
    logger.warn({ err: error }, 'Redis connection failed; location cache disabled');
    return null;
  }
};

const getClient = async (): Promise<RedisClient | null> => {
  if (!clientPromise) {
    clientPromise = createClientIfEnabled();
  }
  return clientPromise;
};

const mapToCachedLocation = (
  doc: Pick<LocationDocument, 'name' | 'type' | 'address' | 'status' | 'location'> & { _id: unknown },
): CachedLocation | null => {
  const lng = doc.location?.coordinates?.[0];
  const lat = doc.location?.coordinates?.[1];
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null;
  }

  return {
    id: String(doc._id),
    name: doc.name,
    type: doc.type,
    address: doc.address,
    status: doc.status,
    location: {
      type: 'Point',
      coordinates: [Number(lng), Number(lat)],
    },
  };
};

export const cacheLocations = async (
  docs: Array<
    Pick<LocationDocument, 'name' | 'type' | 'address' | 'status' | 'location'> & { _id: unknown }
  >,
) => {
  const client = await getClient();
  if (!client || docs.length === 0) {
    return;
  }

  await Promise.all(
    docs.map(async (doc) => {
      const normalized = mapToCachedLocation(doc);
      if (!normalized || normalized.status !== 'active') {
        return;
      }

      const [lng, lat] = normalized.location.coordinates;
      await client.sendCommand(['GEOADD', GEO_KEY, String(lng), String(lat), normalized.id]);
      await client.setEx(getDocKey(normalized.id), DOC_TTL_SECONDS, JSON.stringify(normalized));
    }),
  );
};

export const getNearbyFromCache = async (query: NearbyQuery): Promise<NearbyResult[] | null> => {
  const client = await getClient();
  if (!client) {
    logger.debug('Location cache unavailable; falling back to MongoDB');
    return null;
  }

  const candidateLimit = Math.max(query.limit * CACHE_CANDIDATE_MULTIPLIER, query.limit);

  let raw: unknown;
  try {
    raw = await client.sendCommand([
      'GEORADIUS',
      GEO_KEY,
      String(query.lng),
      String(query.lat),
      String(query.radiusInMeters),
      'm',
      'WITHDIST',
      'ASC',
      'COUNT',
      String(candidateLimit),
    ]);
  } catch (error) {
    logger.warn({ err: error }, 'Redis GEORADIUS failed; fallback to MongoDB');
    return null;
  }

  const rows = Array.isArray(raw) ? (raw as Array<[string, string]>) : [];
  if (rows.length === 0) {
    return [];
  }

  const ids = rows.map((entry) => String(entry?.[0] ?? ''));
  const distanceMap = new Map<string, number>(
    rows.map((entry) => [String(entry?.[0] ?? ''), Number(entry?.[1] ?? Number.NaN)]),
  );
  const cachedDocs = await client.mGet(ids.map(getDocKey));

  const filtered: NearbyResult[] = [];
  for (let i = 0; i < ids.length; i += 1) {
    const parsed = safeParseJson<CachedLocation>(cachedDocs[i]);
    if (!parsed) continue;
    if (parsed.status !== 'active') continue;
    if (query.typeFilter && parsed.type !== query.typeFilter) continue;

    const distanceFromUser = Number(distanceMap.get(ids[i]) ?? Number.NaN);
    filtered.push({
      ...parsed,
      distanceFromUser: Number.isFinite(distanceFromUser)
        ? Math.round(distanceFromUser * 100) / 100
        : 0,
    });

    if (filtered.length >= query.limit) {
      break;
    }
  }

  return filtered;
};

export const shutdownLocationCache = async () => {
  const client = await getClient();
  if (!client) return;
  try {
    await client.quit();
  } catch (error) {
    logger.warn({ err: error }, 'Error while closing Redis client');
  }
};
