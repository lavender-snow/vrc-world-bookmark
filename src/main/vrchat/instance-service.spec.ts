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
  const thumbnailImageUrl = 'https://api.vrchat.cloud/api/1/file/thumbnail/1/file';
  const state = await service.create({ ...options, thumbnailImageUrl });
  expect(auth.requestAuthenticated).toHaveBeenCalledWith('/instances', {
    method: 'POST', retry: false, body: { worldId, type: 'private', region: 'jp', ownerId: userId, canRequestInvite: false },
  });
  expect(state).toMatchObject({ status: 'created', options: { ...options, thumbnailImageUrl } });
  expect(service.list().instances[0].options.thumbnailImageUrl).toBe(thumbnailImageUrl);
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

it('invites self once after creation and prevents reset or duplicates while sending', async () => {
  const { service, auth } = setup();
  let finishCreate: (value: unknown) => void;
  let finishInvite: (value: unknown) => void;
  auth.requestAuthenticated
    .mockReturnValueOnce(new Promise(resolve => { finishCreate = resolve; }))
    .mockReturnValueOnce(new Promise(resolve => { finishInvite = resolve; }));
  const pending = service.create({ ...options, inviteSelf: true });
  await Promise.resolve();
  expect(service.getState(worldId).status).toBe('creating');
  expect(auth.requestAuthenticated).toHaveBeenCalledTimes(1);
  expect(auth.requestAuthenticated).toHaveBeenLastCalledWith('/instances', expect.anything());
  finishCreate(response);
  await Promise.resolve();
  expect(service.getState(worldId)).toMatchObject({ status: 'created', invites: { self: { status: 'sending' } } });
  expect(service.reset(worldId)).toMatchObject({ status: 'created', invites: { self: { status: 'sending' } } });
  await service.create({ ...options, inviteSelf: true });
  await service.invite({ worldId, receiverId: 'self' });
  expect(auth.requestAuthenticated).toHaveBeenNthCalledWith(2,
    `/invite/myself/to/${worldId}:${encodeURIComponent(response.instanceId)}`, { method: 'POST', retry: false });
  finishInvite({ id: 'notification', type: 'invite', receiverUserId: userId });
  expect(await pending).toMatchObject({ status: 'created', invites: { self: { status: 'sent' } } });
  await service.create({ ...options, inviteSelf: true });
  expect(auth.requestAuthenticated).toHaveBeenCalledTimes(2);
});

it.each(['forbidden', 'timeout'] as const)('preserves creation when automatic invitation fails with %s', async code => {
  const { service, auth } = setup();
  auth.requestAuthenticated.mockResolvedValueOnce(response).mockRejectedValueOnce(new VRChatApiError(code));
  const state = await service.create({ ...options, inviteSelf: true });
  expect(state).toMatchObject({ status: 'created', options, invites: { self: { status: code === 'timeout' ? 'unknown' : 'failed', error: { code } } } });
  expect(service.getState(worldId)).toEqual(state);
  await service.create({ ...options, inviteSelf: true });
  expect(auth.requestAuthenticated).toHaveBeenCalledTimes(2);
});

it.each(['forbidden', 'timeout'] as const)('does not invite after creation fails with %s', async code => {
  const { service, auth } = setup();
  auth.requestAuthenticated.mockRejectedValue(new VRChatApiError(code));
  await service.create({ ...options, inviteSelf: true });
  expect(auth.requestAuthenticated).toHaveBeenCalledTimes(1);
});

it('does not invite when disabled and rejects non-boolean invite options', async () => {
  const { service, auth } = setup();
  expect(await service.create({ ...options, inviteSelf: 'true' as any })).toMatchObject({ status: 'failed', error: { code: 'invalidInput' } });
  expect(auth.requestAuthenticated).not.toHaveBeenCalled();
  await service.create({ ...options, inviteSelf: false });
  expect(auth.requestAuthenticated).toHaveBeenCalledTimes(1);
});

it('does not invite in a new session after creation completes in an old session', async () => {
  const { service, auth } = setup();
  let finish: (value: unknown) => void;
  auth.requestAuthenticated.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const pending = service.create({ ...options, inviteSelf: true });
  auth.getSessionKey.mockReturnValue(`2:${userId}`);
  finish(response);
  expect(await pending).toMatchObject({ status: 'idle' });
  expect(auth.requestAuthenticated).toHaveBeenCalledTimes(1);
});

it('discards an automatic invitation result when the session changes during sending', async () => {
  const { service, auth } = setup();
  let finishInvite: (value: unknown) => void;
  auth.requestAuthenticated.mockResolvedValueOnce(response)
    .mockReturnValueOnce(new Promise(resolve => { finishInvite = resolve; }));
  const pending = service.create({ ...options, inviteSelf: true });
  await Promise.resolve();
  expect(service.getState(worldId).invites.self.status).toBe('sending');
  auth.getSessionKey.mockReturnValue(`2:${userId}`);
  finishInvite({ id: 'notification', type: 'invite', receiverUserId: userId });
  expect(await pending).toMatchObject({ status: 'idle' });
  expect(auth.requestAuthenticated).toHaveBeenCalledTimes(2);
});
