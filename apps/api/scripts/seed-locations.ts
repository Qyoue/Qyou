import 'dotenv/config';
import mongoose from 'mongoose';
import { seedLocationsFromProvider } from '../services/placeSeed';

const parseArgs = () => {
  const args = process.argv.slice(2);
  const toValue = (flag: string, fallback?: string) => {
    const index = args.findIndex((arg) => arg === flag);
    if (index === -1) return fallback;
    return args[index + 1];
  };

  const required = (flag: string) => {
    const value = toValue(flag);
    if (!value) {
      throw new Error(`Missing required argument ${flag}`);
    }
    return value;
  };

  return {
    provider: toValue('--provider', 'google'),
    neLat: Number(required('--ne-lat')),
    neLng: Number(required('--ne-lng')),
    swLat: Number(required('--sw-lat')),
    swLng: Number(required('--sw-lng')),
    radiusInMeters: Number(toValue('--radius', '5000')),
    types: (toValue('--types', 'bank,hospital,atm') || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  };
};

const run = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is required');
  }

  const request = parseArgs();
  await mongoose.connect(mongoUri);

  try {
    const result = await seedLocationsFromProvider(request as unknown as Record<string, unknown>);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ success: true, data: result }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
