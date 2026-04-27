import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Location, LocationType } from '../models/Location';
import { User } from '../models/User';
import type { DemoSeedManifest } from './seedManifest';

type DemoLocationSeed = {
  name: string;
  type: LocationType;
  address: string;
  lng: number;
  lat: number;
};

const DEMO_USERS = [
  { email: 'admin@qyou.local', password: 'QyouAdmin123!', role: 'ADMIN' as const },
  { email: 'demo-user-1@qyou.local', password: 'QyouUser123!', role: 'USER' as const },
  { email: 'demo-user-2@qyou.local', password: 'QyouUser123!', role: 'USER' as const },
];

const DEMO_LOCATIONS: DemoLocationSeed[] = [
  {
    name: 'Unity Bank Central',
    type: 'bank',
    address: '12 Broad Street, Lagos Island, Lagos',
    lng: 3.3958,
    lat: 6.4541,
  },
  {
    name: 'General Hospital Marina',
    type: 'hospital',
    address: '1 Marina Road, Lagos Island, Lagos',
    lng: 3.4012,
    lat: 6.4498,
  },
  {
    name: 'City Fuel Station Yaba',
    type: 'fuel_station',
    address: '23 Herbert Macaulay Way, Yaba, Lagos',
    lng: 3.3792,
    lat: 6.5095,
  },
  {
    name: 'Service Center Alausa',
    type: 'government',
    address: 'Secretariat Road, Alausa, Ikeja, Lagos',
    lng: 3.3563,
    lat: 6.6015,
  },
];

const buildQueueFixtures = () =>
  DEMO_LOCATIONS.map((location, index) => ({
    locationName: location.name,
    queueStatus: (index % 2 === 0 ? 'busy' : 'moderate') as 'busy' | 'moderate' | 'quiet',
    estimatedWaitMinutes: 10 + index * 7,
    reportedAt: new Date(Date.now() - index * 15 * 60_000).toISOString(),
    note:
      index % 2 === 0
        ? 'Synthetic fixture for demo playback and UI stubbing.'
        : 'Can be replayed into future queue report endpoints.',
  }));

const ensureDemoUsers = async () => {
  let created = 0;
  let updated = 0;

  for (const user of DEMO_USERS) {
    const passwordHash = await bcrypt.hash(user.password, 12);
    const existing = await User.findOne({ email: user.email });

    if (!existing) {
      await User.create({
        email: user.email,
        passwordHash,
        role: user.role,
      });
      created += 1;
      continue;
    }

    existing.passwordHash = passwordHash;
    existing.role = user.role;
    await existing.save();
    updated += 1;
  }

  return { created, updated };
};

const ensureDemoLocations = async () => {
  let created = 0;
  let updated = 0;

  for (const location of DEMO_LOCATIONS) {
    const existing = await Location.findOne({ name: location.name });

    if (!existing) {
      await Location.create({
        name: location.name,
        type: location.type,
        address: location.address,
        status: 'active',
        location: {
          type: 'Point',
          coordinates: [location.lng, location.lat],
        },
      });
      created += 1;
      continue;
    }

    existing.type = location.type;
    existing.address = location.address;
    existing.status = 'active';
    existing.location = {
      type: 'Point',
      coordinates: [location.lng, location.lat],
    };
    await existing.save();
    updated += 1;
  }

  return { created, updated };
};

const writeQueueFixtureFile = async () => {
  const outputDir = path.join(process.cwd(), 'scripts', 'output');
  const outputFile = path.join(outputDir, 'demo-queue-activity.json');
  await fs.mkdir(outputDir, { recursive: true });

  const payload: DemoSeedManifest = {
    generatedAt: new Date().toISOString(),
    seedMode: 'fixture-only',
    notes: [
      'This file is safe to generate before queue report persistence exists.',
      'Future queue report scripts can ingest this fixture without changing the seed command.',
    ],
    reports: buildQueueFixtures(),
  };

  await fs.writeFile(outputFile, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return outputFile;
};

const SEED_LOCK_FILE = path.join(process.cwd(), 'scripts', 'output', '.seed-lock.json');

const readSeedLock = async (): Promise<{ seededAt?: string } | null> => {
  try {
    const content = await fs.readFile(SEED_LOCK_FILE, 'utf8');
    return JSON.parse(content) as { seededAt?: string };
  } catch {
    return null;
  }
};

const writeSeedLock = async () => {
  const outputDir = path.join(process.cwd(), 'scripts', 'output');
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(
    SEED_LOCK_FILE,
    JSON.stringify({ seededAt: new Date().toISOString() }, null, 2),
    'utf8',
  );
};

const run = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is required');
  }

  const force = process.argv.includes('--force');
  if (!force) {
    const lock = await readSeedLock();
    if (lock?.seededAt) {
      // eslint-disable-next-line no-console
      console.log(
        JSON.stringify(
          { success: true, skipped: true, reason: 'already seeded', seededAt: lock.seededAt },
          null,
          2,
        ),
      );
      return;
    }
  }

  await mongoose.connect(mongoUri);

  try {
    const users = await ensureDemoUsers();
    const locations = await ensureDemoLocations();
    const queueFixtureFile = await writeQueueFixtureFile();
    await writeSeedLock();

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          success: true,
          data: {
            users,
            locations,
            queueFixtureFile,
            demoAccounts: DEMO_USERS.map(({ email, password, role }) => ({ email, password, role })),
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await mongoose.disconnect();
  }
};

run().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
