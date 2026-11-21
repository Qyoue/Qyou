import { QueueStateCache, fetchWithOfflineCache, type KeyValueStorage } from '../../offline/queueStateCache';

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (k) => data.get(k) ?? null,
    setItem: async (k, v) => void data.set(k, v),
    removeItem: async (k) => void data.delete(k),
  };
}

describe('QueueStateCache (#1356)', () => {
  it('round-trips a value and reports staleness by age', async () => {
    let now = 1_000;
    const cache = new QueueStateCache<{ position: number }>({ storage: memoryStorage(), maxAgeMs: 60_000, now: () => now });
    await cache.save('q1', { position: 4 });

    expect(await cache.load('q1')).toEqual({ value: { position: 4 }, savedAt: 1_000, stale: false });
    now += 61_000;
    expect((await cache.load('q1'))!.stale).toBe(true);
    expect(await cache.load('missing')).toBeNull();
  });

  it('drops a corrupt entry instead of throwing', async () => {
    const storage = memoryStorage();
    storage.data.set('qyou.queueState.q1', '{not json');
    const cache = new QueueStateCache({ storage });
    expect(await cache.load('q1')).toBeNull();
    expect(storage.data.has('qyou.queueState.q1')).toBe(false);
  });

  it('fetchWithOfflineCache refreshes on success and falls back to the cache on failure', async () => {
    const cache = new QueueStateCache<string>({ storage: memoryStorage() });
    const ok = await fetchWithOfflineCache(cache, 'q1', async () => 'fresh');
    expect(ok).toEqual({ value: 'fresh', fromCache: false, stale: false });

    const offline = await fetchWithOfflineCache(cache, 'q1', async () => {
      throw new Error('network down');
    });
    expect(offline.value).toBe('fresh');
    expect(offline.fromCache).toBe(true);
  });

  it('rethrows when the fetch fails and nothing is cached', async () => {
    const cache = new QueueStateCache<string>({ storage: memoryStorage() });
    await expect(
      fetchWithOfflineCache(cache, 'q1', async () => {
        throw new Error('network down');
      }),
    ).rejects.toThrow('network down');
  });
});
