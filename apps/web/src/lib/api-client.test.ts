import { getJson, postJson, putJson, deleteJson, request } from './api-client';

describe('api-client request helpers (#1302,#1303)', () => {
  const originalFetch = global.fetch;
  const originalLocation = window.location;

  beforeEach(() => {
    (global as any).fetch = jest.fn();
    window.localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
    jest.restoreAllMocks();
  });

  it('supports GET/PUT/DELETE helpers', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ ok: 'get' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ ok: 'put' }) })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ ok: 'delete' }) });

    await expect(getJson('/a')).resolves.toEqual({ ok: 'get' });
    await expect(putJson('/b', { x: 1 })).resolves.toEqual({ ok: 'put' });
    await expect(deleteJson('/c')).resolves.toEqual({ ok: 'delete' });

    expect((global.fetch as jest.Mock).mock.calls[0][1].method).toBe('GET');
    expect((global.fetch as jest.Mock).mock.calls[1][1].method).toBe('PUT');
    expect((global.fetch as jest.Mock).mock.calls[2][1].method).toBe('DELETE');
  });

  it('refreshes once on 401 and retries the original request', async () => {
    window.localStorage.setItem('qyou.auth', JSON.stringify({ tokens: { accessToken: 'old', refreshToken: 'refresh-token' } }));
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ error: { message: 'Unauthorized' } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ tokens: { accessToken: 'new-token', refreshToken: 'refresh-token' } }) })
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ data: 'ok' }) });

    const result = await postJson<{ data: string }>('/protected', { a: 1 });
    expect(result).toEqual({ data: 'ok' });
    expect(global.fetch).toHaveBeenCalledTimes(3);
    const retryHeaders = (global.fetch as jest.Mock).mock.calls[2][1].headers as Headers;
    expect(retryHeaders.get('Authorization')).toBe('Bearer new-token');
  });

  it('redirects to login when refresh fails on 401', async () => {
    window.localStorage.setItem('qyou.auth', JSON.stringify({ tokens: { accessToken: 'old', refreshToken: 'refresh-token' } }));
    const assign = jest.fn();
    Object.defineProperty(window, 'location', { value: { pathname: '/queue', assign }, writable: true });
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({ error: { message: 'Unauthorized' } }) })
      .mockResolvedValueOnce({ ok: false, status: 401, headers: new Headers({ 'content-type': 'application/json' }), json: async () => ({}) });

    await expect(request('/protected', { method: 'GET' })).rejects.toThrow(/Session expired/i);
    expect(assign).toHaveBeenCalledWith('/login');
  });

  it('passes an AbortSignal and supports timeout option (#1303)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ ok: true }),
    });
    const controller = new AbortController();
    await request('/x', { method: 'GET', signal: controller.signal, timeoutMs: 5000 });
    const opts = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(opts.signal).toBeDefined();
  });
});
