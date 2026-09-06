/** @jest-environment node */
import { VRChatClient } from './client';

function json(value: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(value), { status, headers });
}

describe('VRChat HTTP client', () => {
  it('retains multiple cookies, restores them, and honors deletion and paths', async () => {
    const headers = new Headers();
    headers.append('Set-Cookie', 'auth=secret; Path=/api/1; Secure; HttpOnly');
    headers.append('Set-Cookie', 'twoFactorAuth=verified; Path=/api/1; Secure');
    headers.append('Set-Cookie', 'other=hidden; Path=/unrelated; Secure');
    const fetcher = jest.fn().mockResolvedValueOnce(json({}, 200, headers)).mockResolvedValueOnce(json({}));
    const client = new VRChatClient('test/1 contact', fetcher);
    await client.request('/auth/user');
    const restored = new VRChatClient('test/1 contact', fetcher);
    restored.importCookies(client.exportCookies());
    await restored.request('/auth/user');
    const request = fetcher.mock.calls[1][1];
    expect(request.headers.Cookie).toContain('auth=secret');
    expect(request.headers.Cookie).toContain('twoFactorAuth=verified');
    expect(request.headers.Cookie).not.toContain('other');
    expect(request.headers['User-Agent']).toBe('test/1 contact');
    expect(request.redirect).toBe('error');
    fetcher.mockResolvedValueOnce(json({}, 200, { 'Set-Cookie': 'auth=; Max-Age=0; Path=/api/1' }));
    fetcher.mockResolvedValueOnce(json({}));
    await restored.request('/auth/user');
    await restored.request('/auth/user');
    expect(fetcher.mock.calls[3][1].headers.Cookie).not.toContain('auth=secret');
  });

  it.each(['POST', 'PUT'])('never retries %s on server failures', async method => {
    const fetcher = jest.fn().mockResolvedValue(json({ private: 'secret' }, 500));
    const client = new VRChatClient('test/1', fetcher);
    await expect(client.request('/instances', { method: method as 'POST' | 'PUT' })).rejects.toMatchObject({ code: 'server' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('never retries Basic authentication even though it uses GET', async () => {
    const fetcher = jest.fn().mockResolvedValue(json({}, 500));
    await expect(new VRChatClient('test/1', fetcher).request('/auth/user', { authorization: 'Basic secret' }))
      .rejects.toMatchObject({ code: 'server' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('respects server cooldown and blocks a second request', async () => {
    const fetcher = jest.fn().mockResolvedValue(json({}, 429, { 'Retry-After': '60' }));
    const client = new VRChatClient('test/1', fetcher);
    await expect(client.request('/auth/user')).rejects.toMatchObject({ code: 'rateLimited', retryAfterMs: 60000 });
    await expect(client.request('/auth/user')).rejects.toMatchObject({ code: 'rateLimited' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('retries a GET after backoff', async () => {
    jest.useFakeTimers();
    try {
      const fetcher = jest.fn().mockResolvedValueOnce(json({}, 503)).mockResolvedValueOnce(json({ ok: true }));
      const result = new VRChatClient('test/1', fetcher).request('/auth/user');
      await jest.advanceTimersByTimeAsync(1000);
      await expect(result).resolves.toEqual({ ok: true });
      expect(fetcher).toHaveBeenCalledTimes(2);
    } finally { jest.useRealTimers(); }
  });

  it('times out without exposing the underlying transport error', async () => {
    const fetcher = jest.fn((_url, options) => new Promise<Response>((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('secret transport data')));
    }));
    await expect(new VRChatClient('test/1', fetcher, 5).request('/auth/user', { retry: false }))
      .rejects.toMatchObject({ code: 'timeout', message: 'VRChat operation failed: timeout' });
  });

  it('handles invalid JSON and refuses paths outside the API', async () => {
    const fetcher = jest.fn().mockResolvedValue(new Response('secret invalid JSON'));
    const client = new VRChatClient('test/1', fetcher);
    await expect(client.request('/auth/user')).rejects.toMatchObject({ code: 'invalidResponse' });
    await expect(client.request('/../../outside')).rejects.toMatchObject({ code: 'invalidInput' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('does not send a request when already cancelled', async () => {
    const fetcher = jest.fn();
    const controller = new AbortController();
    controller.abort();
    await expect(new VRChatClient('test/1', fetcher).request('/auth/user', { signal: controller.signal }))
      .rejects.toMatchObject({ code: 'cancelled' });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
