import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { QueueReport } from '../models/QueueReport';
import { buildQueueSnapshotForLocation } from '../services/queueSnapshots';

type MockReport = {
  locationId: string;
  status: string;
  level: 'none' | 'low' | 'medium' | 'high' | 'unknown';
  waitTimeMinutes?: number;
  reportedAt: Date;
};

let mockReports: MockReport[] = [];

const originalFind = QueueReport.find;

const makeFindChain = (reports: MockReport[]) => ({
  sort: () => ({
    limit: () => ({
      lean: async () => reports,
    }),
  }),
});

beforeEach(() => {
  mockReports = [];
  (QueueReport.find as unknown) = ((_filter: unknown) =>
    makeFindChain(mockReports)) as typeof QueueReport.find;
});

afterEach(() => {
  QueueReport.find = originalFind;
});

test('returns unknown snapshot when no reports exist', async () => {
  const result = await buildQueueSnapshotForLocation('loc_1');

  assert.equal(result.locationId, 'loc_1');
  assert.equal(result.level, 'unknown');
  assert.equal(result.reportCount, 0);
  assert.equal(result.confidence, 0);
  assert.equal(result.isStale, true);
  assert.equal(result.lastUpdatedAt, null);
  assert.equal(result.estimatedWaitMinutes, undefined);
});

test('returns snapshot with level from latest report', async () => {
  mockReports = [
    {
      locationId: 'loc_1',
      status: 'accepted',
      level: 'high',
      waitTimeMinutes: 30,
      reportedAt: new Date(),
    },
  ];

  const result = await buildQueueSnapshotForLocation('loc_1');

  assert.equal(result.level, 'high');
  assert.equal(result.reportCount, 1);
  assert.equal(result.estimatedWaitMinutes, 30);
  assert.equal(result.isStale, false);
});

test('averages wait times across multiple reports', async () => {
  const now = new Date();
  mockReports = [
    { locationId: 'loc_1', status: 'accepted', level: 'medium', waitTimeMinutes: 20, reportedAt: now },
    { locationId: 'loc_1', status: 'accepted', level: 'low', waitTimeMinutes: 10, reportedAt: now },
    { locationId: 'loc_1', status: 'accepted', level: 'high', waitTimeMinutes: 30, reportedAt: now },
  ];

  const result = await buildQueueSnapshotForLocation('loc_1');

  assert.equal(result.estimatedWaitMinutes, 20);
  assert.equal(result.reportCount, 3);
});

test('confidence caps at 1.0 with 5 or more reports', async () => {
  const now = new Date();
  mockReports = Array.from({ length: 5 }, (_, i) => ({
    locationId: 'loc_1',
    status: 'accepted',
    level: 'medium' as const,
    waitTimeMinutes: 15,
    reportedAt: new Date(now.getTime() - i * 1000),
  }));

  const result = await buildQueueSnapshotForLocation('loc_1');

  assert.equal(result.confidence, 1);
});

test('confidence is proportional below 5 reports', async () => {
  const now = new Date();
  mockReports = [
    { locationId: 'loc_1', status: 'accepted', level: 'low', waitTimeMinutes: 5, reportedAt: now },
    { locationId: 'loc_1', status: 'accepted', level: 'low', waitTimeMinutes: 5, reportedAt: now },
  ];

  const result = await buildQueueSnapshotForLocation('loc_1');

  assert.equal(result.confidence, 0.4);
});

test('marks snapshot as stale when latest report is older than 30 minutes', async () => {
  const staleDate = new Date(Date.now() - 31 * 60 * 1000);
  mockReports = [
    {
      locationId: 'loc_1',
      status: 'accepted',
      level: 'low',
      waitTimeMinutes: 5,
      reportedAt: staleDate,
    },
  ];

  const result = await buildQueueSnapshotForLocation('loc_1');

  assert.equal(result.isStale, true);
});

test('ignores non-finite wait times when computing average', async () => {
  const now = new Date();
  mockReports = [
    { locationId: 'loc_1', status: 'accepted', level: 'medium', waitTimeMinutes: undefined, reportedAt: now },
    { locationId: 'loc_1', status: 'accepted', level: 'medium', waitTimeMinutes: 20, reportedAt: now },
  ];

  const result = await buildQueueSnapshotForLocation('loc_1');

  assert.equal(result.estimatedWaitMinutes, 20);
});
