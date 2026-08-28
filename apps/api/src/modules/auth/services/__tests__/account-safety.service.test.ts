import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AccountSafetyService } from '../account-safety.service.js';

describe('AccountSafetyService', () => {
  const service = new AccountSafetyService();

  it('unlocks while attempts are below the threshold', () => {
    const status = service.evaluateLockout(3);

    assert.equal(status.isLocked, false);
    assert.equal(status.attemptsCount, 3);
    assert.equal(status.lockoutReason, undefined);
  });

  it('locks when attempts reach the threshold', () => {
    const status = service.evaluateLockout(5);

    assert.equal(status.isLocked, true);
    assert.equal(status.lockoutReason, 'Too many failed login attempts.');
  });

  it('stays locked beyond the threshold', () => {
    const status = service.evaluateLockout(10);

    assert.equal(status.isLocked, true);
    assert.equal(status.attemptsCount, 10);
  });
});
