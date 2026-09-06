/** @jest-environment node */
import { VRChatAuthService } from './auth-service';
import { VRChatApiError } from './errors';

const user = { id: 'usr_00000000-0000-0000-0000-000000000001', displayName: 'Test' };
const credentials = { username: 'user:日本', password: 'pass:% word' };

function setup() {
  const clients: { request: jest.Mock; exportCookies: jest.Mock; importCookies: jest.Mock }[] = [];
  const factory = () => {
    const client = { request: jest.fn(), exportCookies: jest.fn(() => 'cookies'), importCookies: jest.fn() };
    clients.push(client);
    return client;
  };
  const store = { load: jest.fn((): string | null => null), save: jest.fn(() => true), clear: jest.fn() };
  const service = new VRChatAuthService(factory, store);
  return { clients, store, service, factory };
}

describe('VRChat authentication service', () => {
  it('does not make a network request when no session is saved', async () => {
    const { service, clients } = setup();
    expect(await service.restoreSession()).toMatchObject({ ok: true, state: { status: 'signedOut' } });
    expect(clients[0].request).not.toHaveBeenCalled();
  });

  it('restores saved cookies without Basic credentials and projects public user data', async () => {
    const { service, factory, store } = setup();
    const restored = factory();
    restored.request.mockResolvedValue({ ...user, authToken: 'secret' });
    // Substitute a stable factory for the newly created client.
    const auth = new VRChatAuthService(() => restored, store);
    store.load.mockReturnValue('saved-cookies');
    expect(await auth.restoreSession()).toEqual({ ok: true, state: { status: 'authenticated', user, persistence: 'saved' } });
    expect(restored.importCookies).toHaveBeenCalledWith('saved-cookies');
    expect(restored.request.mock.calls[0][1]).not.toHaveProperty('authorization');
    expect(service.getState().status).toBe('signedOut');
  });

  it.each(['totp', 'emailOtp'] as const)('logs in and completes %s with a fresh current-user check', async method => {
    const { factory, store } = setup();
    const client = factory();
    const service = new VRChatAuthService(() => client, store);
    client.request.mockResolvedValueOnce({ requiresTwoFactorAuth: [method] })
      .mockResolvedValueOnce({ verified: true }).mockResolvedValueOnce(user);
    expect(await service.login(credentials)).toMatchObject({ ok: true, state: { status: 'twoFactorRequired', methods: [method] } });
    expect(store.save).not.toHaveBeenCalled();
    const basic = client.request.mock.calls[0][1].authorization.slice(6);
    expect(Buffer.from(basic, 'base64').toString()).toBe(`${encodeURIComponent(credentials.username)}:${encodeURIComponent(credentials.password)}`);
    expect(await service.verifyTwoFactor({ method, code: '123456' })).toMatchObject({ ok: true, state: { status: 'authenticated' } });
    expect(client.request.mock.calls[1][0]).toBe(`/auth/twofactorauth/${method === 'emailOtp' ? 'emailotp' : 'totp'}/verify`);
    expect(client.request.mock.calls[2][0]).toBe('/auth/user');
    expect(store.save).toHaveBeenCalledWith('cookies');
    expect(JSON.stringify(service.getState())).not.toContain('cookies');
  });

  it.each(['network', 'unauthorized'] as const)('distinguishes %s during restore', async code => {
    const { factory, store } = setup();
    const client = factory();
    client.request.mockRejectedValue(new VRChatApiError(code));
    store.load.mockReturnValue('saved');
    const service = new VRChatAuthService(() => client, store);
    expect(await service.restoreSession()).toMatchObject({ ok: false, state: { status: code === 'unauthorized' ? 'expired' : 'restoreFailed' } });
    expect(store.clear).toHaveBeenCalledTimes(code === 'unauthorized' ? 1 : 0);
  });

  it('keeps corrupt saved data untouched during restore', async () => {
    const { service, store } = setup();
    store.load.mockImplementation(() => { throw new VRChatApiError('storage'); });
    expect(await service.restoreSession()).toMatchObject({ ok: false, error: { code: 'storage' } });
    expect(store.clear).not.toHaveBeenCalled();
    expect(store.save).not.toHaveBeenCalled();
  });

  it('keeps a login usable in memory when encrypted persistence is unavailable', async () => {
    const { factory, store } = setup();
    const client = factory();
    client.request.mockResolvedValue(user);
    store.save.mockReturnValue(false);
    expect(await new VRChatAuthService(() => client, store).login(credentials))
      .toMatchObject({ ok: true, state: { status: 'authenticated', persistence: 'memory', error: { code: 'storage' } } });
  });

  it('rejects overlapping logins and ignores late responses after logout', async () => {
    const { store } = setup();
    let resolveLogin: (value: unknown) => void;
    const pending = new Promise(resolve => { resolveLogin = resolve; });
    const controlled = { request: jest.fn().mockReturnValueOnce(pending).mockResolvedValue({}), exportCookies: () => 'cookies', importCookies: jest.fn() };
    const auth = new VRChatAuthService(() => controlled, store);
    const attempt = auth.login(credentials);
    expect(await auth.login(credentials)).toMatchObject({ ok: false, error: { code: 'busy' } });
    await auth.logout();
    resolveLogin(user);
    expect(await attempt).toMatchObject({ ok: false, error: { code: 'cancelled' } });
    expect(auth.getState().status).toBe('signedOut');
    expect(store.save).not.toHaveBeenCalled();
  });

  it('clears the local session even if server logout fails', async () => {
    const { service, clients, store } = setup();
    clients[0].request.mockRejectedValue(new VRChatApiError('network'));
    expect(await service.logout()).toMatchObject({ ok: false, state: { status: 'signedOut' }, error: { code: 'network' } });
    expect(store.clear).toHaveBeenCalled();
  });

  it('retries current-user lookup without submitting a verified OTP again', async () => {
    const { factory, store } = setup();
    const client = factory();
    client.request.mockResolvedValueOnce({ requiresTwoFactorAuth: ['totp'] })
      .mockResolvedValueOnce({ verified: true }).mockRejectedValueOnce(new VRChatApiError('network'))
      .mockResolvedValueOnce(user);
    const service = new VRChatAuthService(() => client, store);
    await service.login(credentials);
    expect(await service.verifyTwoFactor({ method: 'totp', code: '123456' })).toMatchObject({ ok: false, error: { code: 'network' } });
    expect(await service.verifyTwoFactor({ method: 'totp', code: '123456' })).toMatchObject({ ok: true, state: { status: 'authenticated' } });
    expect(client.request.mock.calls.map(call => call[0])).toEqual([
      '/auth/user', '/auth/twofactorauth/totp/verify', '/auth/user', '/auth/user',
    ]);
  });

  it('rejects unsupported 2FA and invalid login inputs before network access', async () => {
    const { service, clients } = setup();
    expect(await service.login({ username: '', password: 'password' })).toMatchObject({ ok: false, error: { code: 'invalidInput' } });
    expect(await service.verifyTwoFactor({ method: 'totp', code: '123456' })).toMatchObject({ ok: false, error: { code: 'invalidInput' } });
    expect(clients[0].request).not.toHaveBeenCalled();
  });
});
