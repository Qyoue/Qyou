import { parseDeepLink } from '../../linking/deepLinks';
import { BiometricGate } from '../../security/biometricUnlock';
import { collectIntegritySignals, decide, verdictFor } from '../../security/deviceIntegrity';
import { chainMatchesPins, validatePinConfig } from '../../security/certificatePinning';

describe('deep links (#1352)', () => {
  it('parses the custom scheme and universal links into the closed route set', () => {
    expect(parseDeepLink('qyou://wallet')).toEqual({ name: 'wallet' });
    expect(parseDeepLink('qyou://rewards')).toEqual({ name: 'rewards' });
    expect(parseDeepLink('qyou://queue/abc-123')).toEqual({ name: 'queue', queueId: 'abc-123' });
    expect(parseDeepLink('https://links.qyou.example/queue/abc-123')).toEqual({ name: 'queue', queueId: 'abc-123' });
  });

  it('rejects other schemes, hosts, credentials, extra segments and bad ids', () => {
    for (const url of [
      'javascript:alert(1)',
      'https://evil.example/wallet',
      'https://user:pw@links.qyou.example/wallet',
      'qyou://wallet/extra',
      'qyou://queue/../etc',
      'qyou://queue/' + 'x'.repeat(65),
      'qyou://unknown',
      'not a url',
    ]) {
      expect(parseDeepLink(url)).toBeNull();
    }
  });
});

describe('BiometricGate (#1353)', () => {
  function gate(authResults: boolean[], available = true) {
    const store = new Map<string, string>();
    let now = 0;
    const g = new BiometricGate({
      authenticator: { isAvailable: async () => available, authenticate: async () => authResults.shift() ?? false },
      storage: { getItem: async (k) => store.get(k) ?? null, setItem: async (k, v) => void store.set(k, v) },
      now: () => now,
      lockAfterMs: 1000,
      maxFailures: 2,
    });
    return { g, advance: (ms: number) => (now += ms) };
  }

  it('enabling needs an available authenticator and a successful check', async () => {
    expect(await gate([true], false).g.enable()).toBe(false);
    expect(await gate([false]).g.enable()).toBe(false);
    const { g } = gate([true]);
    expect(await g.enable()).toBe(true);
    expect(await g.isEnabled()).toBe(true);
  });

  it('falls back to the password after repeated failures', async () => {
    const { g } = gate([true, false, false, true]);
    await g.enable();
    expect(await g.unlock()).toBe('failed');
    expect(await g.unlock()).toBe('password-required');
    expect(await g.unlock()).toBe('password-required');
    g.resetFailures();
    expect(await g.unlock()).toBe('unlocked');
  });

  it('locks after being backgrounded for the configured time', async () => {
    const { g, advance } = gate([true]);
    await g.enable();
    g.onBackground();
    advance(500);
    expect(g.shouldLock()).toBe(false);
    advance(600);
    expect(g.shouldLock()).toBe(true);
  });
});

describe('device integrity (#1354)', () => {
  it('collects signals and blocks sensitive actions on a compromised device', async () => {
    const signals = await collectIntegritySignals('android', async (p) => p === '/system/xbin/su');
    expect(signals.suspiciousPathsFound).toEqual(['/system/xbin/su']);
    expect(verdictFor(signals)).toBe('compromised');
    expect(decide('view', signals)).toEqual({ allowed: true, warn: true });
    expect(decide('sign-transaction', signals)).toMatchObject({ allowed: false });
    expect(decide('reveal-key', signals)).toMatchObject({ allowed: false });
  });

  it('allows everything on a trusted device', async () => {
    const signals = await collectIntegritySignals('ios', async () => false);
    expect(decide('sign-transaction', signals)).toEqual({ allowed: true, warn: false });
  });
});

describe('certificate pinning config (#1355)', () => {
  const pin = (c: string) => c.repeat(43) + '=';
  const future = new Date(Date.now() + 86_400_000).toISOString();

  it('requires two valid unique pins and an unexpired set', () => {
    expect(validatePinConfig({ host: 'api.x', pins: [pin('A'), pin('B')], expiresAt: future })).toEqual([]);
    expect(validatePinConfig({ host: 'api.x', pins: [pin('A')], expiresAt: future })).toContain(
      'at least two pins (current and backup) are required',
    );
    expect(validatePinConfig({ host: 'api.x', pins: [pin('A'), pin('A')], expiresAt: future })).toContain('duplicate pins');
    expect(validatePinConfig({ host: 'api.x', pins: [pin('A'), 'bad'], expiresAt: future })[0]).toMatch(/invalid pin/);
    expect(validatePinConfig({ host: 'api.x', pins: [pin('A'), pin('B')], expiresAt: '2020-01-01T00:00:00Z' })).toContain('pin set has expired');
  });

  it('matches when any chain certificate is pinned', () => {
    const cfg = { host: 'api.x', pins: [pin('A'), pin('B')], expiresAt: future };
    expect(chainMatchesPins([pin('Z'), pin('B')], cfg)).toBe(true);
    expect(chainMatchesPins([pin('Z')], cfg)).toBe(false);
  });
});
