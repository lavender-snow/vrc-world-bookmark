/** @jest-environment node */
import { VRChatAuthService } from './auth-service';
import { getCurrentWorld } from './current-world';
import { VRChatApiError } from './errors';

const user = { id: 'usr_00000000-0000-0000-0000-000000000001', displayName: 'Test' };
const worldId = 'wrld_00000000-0000-0000-0000-000000000001';
const otherWorldId = 'wrld_00000000-0000-0000-0000-000000000002';
const location = `${worldId}:123~private(${user.id})~nonce(secret)`;

async function setup() {
  const client = { request: jest.fn().mockResolvedValueOnce(user), exportCookies: () => 'cookies', importCookies: jest.fn() };
  const store = { load: () => null as string | null, save: () => true, clear: jest.fn() };
  const auth = new VRChatAuthService(() => client, store);
  await auth.login({ username: 'test', password: 'test' });
  client.request.mockClear();
  return { auth, client };
}

it('fetches the latest current world on each request and exposes only its ID', async () => {
  const { auth, client } = await setup();
  client.request.mockResolvedValueOnce({ ...user, location, authToken: 'secret', travelingToWorld: otherWorldId })
    .mockResolvedValueOnce({ ...user, location: `${otherWorldId}:456` });
  expect(await getCurrentWorld(auth)).toEqual({ ok: true, worldId });
  expect(await getCurrentWorld(auth)).toEqual({ ok: true, worldId: otherWorldId });
  expect(client.request.mock.calls).toEqual([['/auth/user', {}], ['/auth/user', {}]]);
});

it('requires login before making a current-world request', async () => {
  const { auth, client } = await setup();
  client.request.mockResolvedValueOnce({});
  await auth.logout();
  client.request.mockClear();
  expect(await getCurrentWorld(auth)).toEqual({ ok: false, error: { code: 'unauthorized' } });
  expect(client.request).not.toHaveBeenCalled();
});

it.each([undefined, null, '', 'offline', 'private', `${otherWorldId}:456`])('uses presence.world when the legacy location is %s', async location => {
  const { auth, client } = await setup();
  client.request.mockResolvedValueOnce({
    ...user, location, state: 'offline', authToken: 'secret',
    presence: { id: user.id, world: worldId, instance: '123~private(secret)', travelingToWorld: otherWorldId },
  });
  expect(await getCurrentWorld(auth)).toEqual({ ok: true, worldId });
});

it('can register the current world without requiring a presence instance ID', async () => {
  const { auth, client } = await setup();
  client.request.mockResolvedValueOnce({ ...user, presence: { world: worldId, instance: null } });
  expect(await getCurrentWorld(auth)).toEqual({ ok: true, worldId });
});

it.each(['offline', 'private', 'traveling', '', null])('does not fall back to a stale location when presence.world is %s', async world => {
  const { auth, client } = await setup();
  client.request.mockResolvedValueOnce({
    ...user, location, worldId, presence: { world, travelingToWorld: otherWorldId },
  });
  expect(await getCurrentWorld(auth)).toEqual({ ok: false, error: { code: 'notInWorld' } });
});

it.each([42, 'wrld_invalid', '../worlds', `${worldId}:123`])('rejects an invalid presence world: %s', async world => {
  const { auth, client } = await setup();
  client.request.mockResolvedValueOnce({ ...user, presence: { world } });
  expect(await getCurrentWorld(auth)).toEqual({ ok: false, error: { code: 'invalidResponse' } });
});

it('rejects presence belonging to a different account', async () => {
  const { auth, client } = await setup();
  client.request.mockResolvedValueOnce({
    ...user, presence: { id: 'usr_00000000-0000-0000-0000-000000000002', world: worldId },
  });
  expect(await getCurrentWorld(auth)).toEqual({ ok: false, error: { code: 'unauthorized' } });
});

it.each([null, {}])('supports a legacy location when presence has no world field: %j', async presence => {
  const { auth, client } = await setup();
  client.request.mockResolvedValueOnce({ ...user, presence, location });
  expect(await getCurrentWorld(auth)).toEqual({ ok: true, worldId });
});

it.each(['offline', 'private', 'traveling', '', null, undefined])('does not register a stale world or travel destination when location is %s', async location => {
  const { auth, client } = await setup();
  client.request.mockResolvedValueOnce({ ...user, location, worldId, travelingToLocation: `${otherWorldId}:456` });
  expect(await getCurrentWorld(auth)).toEqual({ ok: false, error: { code: 'notInWorld' } });
});

it.each([42, 'secret-location', `${worldId}:`, `${worldId}:123:secret`, '../worlds:123'])('rejects malformed locations without exposing their values: %s', async location => {
  const { auth, client } = await setup();
  client.request.mockResolvedValueOnce({ ...user, location });
  expect(await getCurrentWorld(auth)).toEqual({ ok: false, error: { code: 'invalidResponse' } });
});

it('rejects a response for a different account', async () => {
  const { auth, client } = await setup();
  client.request.mockResolvedValueOnce({ ...user, id: 'usr_00000000-0000-0000-0000-000000000002', location });
  expect(await getCurrentWorld(auth)).toEqual({ ok: false, error: { code: 'unauthorized' } });
});

it.each(['unauthorized', 'network', 'rateLimited'] as const)('returns a safe %s error', async code => {
  const { auth, client } = await setup();
  client.request.mockRejectedValueOnce(new VRChatApiError(code));
  expect(await getCurrentWorld(auth)).toEqual({ ok: false, error: { code } });
  if (code === 'unauthorized') expect(auth.getState().status).toBe('expired');
});

it('rejects a late current-world response after logout', async () => {
  const { auth, client } = await setup();
  let finish: (value: unknown) => void;
  client.request.mockReturnValueOnce(new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce({});
  const pending = getCurrentWorld(auth);
  await auth.logout();
  finish({ ...user, location });
  expect(await pending).toEqual({ ok: false, error: { code: 'cancelled' } });
});
