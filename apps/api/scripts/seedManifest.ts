/**
 * Manifest contract for demo seed artifacts.
 *
 * The seed script writes `scripts/output/demo-queue-activity.json` with this shape.
 * Downstream tooling (queue report ingestion, UI stubs) should validate against this type.
 */

export type DemoQueueFixture = {
  locationName: string;
  queueStatus: 'busy' | 'moderate' | 'quiet';
  estimatedWaitMinutes: number;
  reportedAt: string; // ISO 8601
  note?: string;
};

export type DemoSeedManifest = {
  /** ISO 8601 timestamp of when the manifest was generated */
  generatedAt: string;
  /** Indicates the seed mode used */
  seedMode: 'fixture-only' | 'full';
  /** Human-readable notes about the manifest */
  notes: string[];
  /** Synthetic queue activity fixtures */
  reports: DemoQueueFixture[];
};
