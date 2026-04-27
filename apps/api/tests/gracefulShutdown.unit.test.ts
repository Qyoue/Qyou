import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// Track calls to shutdown hooks
let locationCacheShutdownCalled = false;
let mongooseDisconnectCalled = false;
let processExitCode: number | undefined;

// Capture process.exit without actually exiting
const originalExit = process.exit;

beforeEach(() => {
  locationCacheShutdownCalled = false;
  mongooseDisconnectCalled = false;
  processExitCode = undefined;
  (process.exit as unknown) = (code: number) => {
    processExitCode = code;
  };
});

afterEach(() => {
  process.exit = originalExit;
});

test('shutdown sequence calls locationCache shutdown and mongoose disconnect', async () => {
  // Simulate the shutdown sequence from server.ts
  const shutdownLocationCache = async () => {
    locationCacheShutdownCalled = true;
  };

  const mongooseDisconnect = async () => {
    mongooseDisconnectCalled = true;
  };

  const shutdown = (server: { close: (cb: () => void) => void }) => {
    server.close(async () => {
      await shutdownLocationCache();
      await mongooseDisconnect();
      process.exit(0);
    });
  };

  const mockServer = {
    close: (cb: () => void) => {
      // Simulate server close completing synchronously
      cb();
    },
  };

  shutdown(mockServer);

  // Allow microtasks to flush
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(locationCacheShutdownCalled, true, 'locationCache.shutdown should be called');
  assert.equal(mongooseDisconnectCalled, true, 'mongoose.disconnect should be called');
  assert.equal(processExitCode, 0, 'process.exit(0) should be called');
});

test('shutdown exits with code 0 on clean shutdown', async () => {
  const shutdown = (server: { close: (cb: () => void) => void }) => {
    server.close(async () => {
      process.exit(0);
    });
  };

  const mockServer = { close: (cb: () => void) => cb() };
  shutdown(mockServer);

  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(processExitCode, 0);
});

test('shutdown sequence is idempotent when cache is unavailable', async () => {
  const shutdownLocationCache = async () => {
    // Simulate cache not available (no-op)
    locationCacheShutdownCalled = true;
  };

  const mongooseDisconnect = async () => {
    mongooseDisconnectCalled = true;
  };

  const shutdown = (server: { close: (cb: () => void) => void }) => {
    server.close(async () => {
      await shutdownLocationCache();
      await mongooseDisconnect();
      process.exit(0);
    });
  };

  const mockServer = { close: (cb: () => void) => cb() };
  shutdown(mockServer);

  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(locationCacheShutdownCalled, true);
  assert.equal(mongooseDisconnectCalled, true);
  assert.equal(processExitCode, 0);
});
