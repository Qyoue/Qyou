import { getSafeNextPath } from './safe-next';

describe('getSafeNextPath', () => {
  it('allows same-origin relative paths', () => {
    expect(getSafeNextPath('/queue?tab=mine')).toBe('/queue?tab=mine');
  });
  it('rejects external and protocol-relative paths', () => {
    expect(getSafeNextPath('https://evil.com')).toBe('/queue');
    expect(getSafeNextPath('//evil.com')).toBe('/queue');
    expect(getSafeNextPath('/\\evil.com')).toBe('/queue');
  });
});
