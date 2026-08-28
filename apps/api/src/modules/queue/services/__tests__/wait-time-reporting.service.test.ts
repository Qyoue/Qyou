import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { WaitTimeReportingService } from '../wait-time-reporting.service.js';

describe('WaitTimeReportingService', () => {
  const service = new WaitTimeReportingService();

  it('submits a report and attributes it to the reporter', async () => {
    const report = await service.submitReport('user-1', {
      queueId: 'q1',
      reportedWaitMinutes: 10,
    });

    assert.equal(report.queueId, 'q1');
    assert.equal(report.reporterUserId, 'user-1');
    assert.equal(report.reportedWaitMinutes, 10);
  });

  it('calculates empty metrics for an empty queue', () => {
    const metrics = service.calculateMetrics('q-empty');
    assert.equal(metrics.averageWaitMinutes, 0);
    assert.equal(metrics.reportsCount, 0);
    assert.equal(metrics.confidenceScore, 0);
  });

  it('averages wait times across multiple reports', async () => {
    await service.submitReport('user-1', { queueId: 'q2', reportedWaitMinutes: 10 });
    await service.submitReport('user-2', { queueId: 'q2', reportedWaitMinutes: 30 });

    const metrics = service.calculateMetrics('q2');
    assert.equal(metrics.reportsCount, 2);
    assert.equal(metrics.averageWaitMinutes, 20);
    assert.equal(metrics.confidenceScore, 40);
  });
});
