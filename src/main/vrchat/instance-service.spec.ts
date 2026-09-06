/** @jest-environment node */
import type { VRChatAuthService } from './auth-service';
import { VRChatApiError } from './errors';
import { VRChatInstanceService } from './instance-service';

const worldId = 'wrld_00000000-0000-0000-0000-000000000001';
const userId = 'usr_00000000-0000-0000-0000-000000000001';
const options = { worldId, access: 'invite' as const, region: 'jp' as const };
const response = { worldId, instanceId: '123~private(secret)', location: `${worldId}:123~private(secret)` };
function setup() {
  const auth = {
    getSessionKey: jest.fn((): string | undefined => `1:${userId}`),
    getState: jest.fn(() => ({ status: 'authenticated', user: { id: userId } })),
    requestAuthenticated: jest.fn().mockResolvedValue(response),
  };
  return { auth, service: new VRChatInstanceService(auth as unknown as VRChatAuthService) };
}

it('creates using authenticated ownership and keeps private locations out of renderer state', async () => {
  const { service, auth } = setup();
  const state = await service.create(options);
  expect(auth.requestAuthenticated).toHaveBeenCalledWith('/instances', {
    method: 'POST', retry: false, body: { worldId, type: 'private', region: 'jp', ownerId: userId, canRequestInvite: false },
  });
  expect(state).toMatchObject({ status: 'created', options });
  expect(JSON.stringify(state)).not.toContain('secret');
  expect(service.getState(worldId)).toEqual(state);
  await service.create(options);
  expect(auth.requestAuthenticated).toHaveBeenCalledTimes(1);
});

it('prevents duplicate requests and resetting while creating', async () => {
  const { service, auth } = setup();
  let finish: (value: unknown) => void;
  auth.requestAuthenticated.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const first = service.create(options);
  expect(await service.create(options)).toMatchObject({ status: 'creating' });
  expect(service.reset(worldId).status).toBe('creating');
  finish(response);
  await first;
  expect(auth.requestAuthenticated).toHaveBeenCalledTimes(1);
});

it.each(['timeout', 'network', 'server', 'invalidResponse'] as const)('holds %s as unknown until explicit reset', async code => {
  const { service, auth } = setup();
  auth.requestAuthenticated.mockRejectedValue(new VRChatApiError(code));
  expect(await service.create(options)).toMatchObject({ status: 'unknown', error: { code } });
  await service.create(options);
  expect(auth.requestAuthenticated).toHaveBeenCalledTimes(1);
  service.reset(worldId);
  auth.requestAuthenticated.mockResolvedValue(response);
  expect(await service.create(options)).toMatchObject({ status: 'created' });
});

it('treats a mismatched response world as unknown', async () => {
  const { service, auth } = setup();
  auth.requestAuthenticated.mockResolvedValue({ ...response, worldId: 'invalid' });
  expect(await service.create(options)).toMatchObject({ status: 'unknown' });
});

it('discards old-session results even when the same user logs in again', async () => {
  const { service, auth } = setup();
  let finish: (value: unknown) => void;
  auth.requestAuthenticated.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const pending = service.create(options);
  auth.getSessionKey.mockReturnValue(`2:${userId}`);
  finish(response);
  expect(await pending).toEqual({ loggedIn: true, status: 'idle' });
  expect(service.getState(worldId)).toEqual({ loggedIn: true, status: 'idle' });
});

it('clears retained results when logged out', async () => {
  const { service, auth } = setup();
  await service.create(options);
  auth.getSessionKey.mockReturnValue(undefined);
  expect(service.getState(worldId)).toEqual({ loggedIn: false, status: 'idle' });
});

it('rejects invalid input before sending and handles a definite permission failure', async () => {
  const { service, auth } = setup();
  expect(await service.create({ ...options, access: 'group' as any })).toMatchObject({ status: 'failed', error: { code: 'invalidInput' } });
  expect(auth.requestAuthenticated).not.toHaveBeenCalled();
  auth.requestAuthenticated.mockRejectedValue(new VRChatApiError('forbidden'));
  expect(await service.create(options)).toMatchObject({ status: 'failed', error: { code: 'forbidden' } });
});
