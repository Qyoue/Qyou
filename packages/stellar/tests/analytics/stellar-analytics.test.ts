import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  StellarAnalyticsTracker,
  StellarAnalyticsEventType,
} from '../../src/analytics/stellar-analytics.js';
import type { StellarAnalyticsPayload } from '../../src/analytics/stellar-analytics.js';

describe('Stellar Analytics Tracker (#1019)', () => {
  let tracker: StellarAnalyticsTracker;

  beforeEach(() => {
    tracker = StellarAnalyticsTracker.getInstance();
    tracker.clear();
  });

  it('tracks wallet linking events and emits to subscribers', () => {
    const receivedEvents: StellarAnalyticsPayload[] = [];
    const unsubscribe = tracker.subscribe((event) => {
      receivedEvents.push(event);
    });

    tracker.track({
      eventType: StellarAnalyticsEventType.WALLET_CONNECTED,
      userId: 'user-analytics-1',
      publicKey: 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFTGOBDKR3GYWUM7AZTQU',
    });

    assert.equal(receivedEvents.length, 1);
    assert.equal(receivedEvents[0].eventType, StellarAnalyticsEventType.WALLET_CONNECTED);
    assert.equal(receivedEvents[0].userId, 'user-analytics-1');
    assert.ok(receivedEvents[0].timestamp > 0);

    unsubscribe();
  });

  it('tracks reward confirmation and maintains in-memory event buffer', () => {
    tracker.track({
      eventType: StellarAnalyticsEventType.REWARD_CONFIRMED,
      userId: 'user-analytics-2',
      queueId: 'queue-fast',
      amount: '5.0000000',
      asset: 'native',
      transactionHash: '0xabc123',
    });

    const recent = tracker.getRecentEvents();
    assert.equal(recent.length, 1);
    assert.equal(recent[0].eventType, StellarAnalyticsEventType.REWARD_CONFIRMED);
    assert.equal(recent[0].amount, '5.0000000');
    assert.equal(recent[0].transactionHash, '0xabc123');
  });

  it('tracks failed reward distributions with error details', () => {
    tracker.track({
      eventType: StellarAnalyticsEventType.REWARD_FAILED,
      userId: 'user-analytics-3',
      queueId: 'queue-busy',
      error: 'Horizon network timeout',
    });

    const recent = tracker.getRecentEvents();
    assert.equal(recent.length, 1);
    assert.equal(recent[0].eventType, StellarAnalyticsEventType.REWARD_FAILED);
    assert.equal(recent[0].error, 'Horizon network timeout');
  });
});
