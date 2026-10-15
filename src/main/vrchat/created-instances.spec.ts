/** @jest-environment node */
import type { VRChatAuthService } from './auth-service';
import { VRChatApiError } from './errors';
import { VRChatInstanceService } from './instance-service';

const worldId = 'wrld_00000000-0000-0000-0000-000000000001';
const userId = 'usr_00000000-0000-0000-0000-000000000001';
const options = { worldId, worldName: 'Test world', access: 'invite' as const, region: 'jp' as const };
const reference = { worldId, instanceId: '123~private(secret)', location: `${worldId}:123~private(secret)`, ownerId: userId };
function setup() {
  const auth = {
    getSessionKey: jest.fn((): string | undefined => 'session-1'),
    getState: jest.fn(() => ({ status: 'authenticated', user: { id: userId } })),
    requestAuthenticated: jest.fn().mockResolvedValue(reference),
  };
  return { auth, service: new VRChatInstanceService(auth as unknown as VRChatAuthService) };
}

it('retains separate instances for the same world after reset without exposing private locations', async () => {
  const { auth, service } = setup();
  const first = await service.create(options);
  service.reset(worldId);
  auth.requestAuthenticated.mockResolvedValueOnce({ ...reference, instanceId: '456~private(other)', location: `${worldId}:456~private(other)` });
  const second = await service.create(options);
  const list = service.list();
  expect(list.instances.map(instance => instance.instanceKey)).toEqual([second.instanceKey, first.instanceKey]);
  expect(list.instances[1].options.worldName).toBe('Test world');
  expect(JSON.stringify(list)).not.toMatch(/secret|private\(|other/);
  list.instances[0].options.region = 'eu';
  expect(service.list().instances[0].options.region).toBe('jp');
  auth.requestAuthenticated.mockResolvedValueOnce({ id: 'notification', type: 'invite', receiverUserId: userId });
  await service.invite({ worldId, instanceKey: first.instanceKey, receiverId: 'self' });
  expect(auth.requestAuthenticated).toHaveBeenLastCalledWith(`/invite/myself/to/${worldId}:${encodeURIComponent(reference.instanceId)}`, { method: 'POST', retry: false });
  expect(service.getState(worldId).instanceKey).toBe(second.instanceKey);
  expect(service.getState(worldId).invites).toBeUndefined();
  expect(service.list().instances[1].invites.self.status).toBe('sent');
});

it('closes the selected instance and prevents invitation or duplicate close afterwards', async () => {
  const { auth, service } = setup();
  const first = await service.create(options);
  service.reset(worldId);
  const second = await service.create(options);
  auth.requestAuthenticated.mockResolvedValueOnce({ ...reference, closedAt: new Date().toISOString() });
  await service.close({ instanceKey: first.instanceKey });
  expect(auth.requestAuthenticated).toHaveBeenLastCalledWith(`/instances/${worldId}:${encodeURIComponent(reference.instanceId)}`, { method: 'DELETE', retry: false });
  expect(service.list().instances[1].closeStatus).toBe('closed');
  expect(service.getState(worldId)).toMatchObject({ instanceKey: second.instanceKey });
  expect(service.getState(worldId).closeStatus).toBeUndefined();
  await service.close({ instanceKey: first.instanceKey });
  await expect(service.invite({ worldId, instanceKey: first.instanceKey, receiverId: 'self' })).rejects.toMatchObject({ code: 'invalidInput' });
  expect(auth.requestAuthenticated).toHaveBeenCalledTimes(3);
});

it('blocks duplicate close, reset and invite while closing', async () => {
  const { auth, service } = setup();
  const state = await service.create(options);
  let finish: (value: unknown) => void;
  auth.requestAuthenticated.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const pending = service.close({ instanceKey: state.instanceKey });
  expect(service.reset(worldId).closeStatus).toBe('closing');
  await service.close({ instanceKey: state.instanceKey });
  await expect(service.invite({ worldId, receiverId: 'self' })).rejects.toMatchObject({ code: 'invalidInput' });
  expect(auth.requestAuthenticated).toHaveBeenCalledTimes(2);
  finish({ ...reference, closedAt: new Date().toISOString() });
  await pending;
  expect(service.getState(worldId).closeStatus).toBe('closed');
});

it('does not close an instance while an invite is pending', async () => {
  const { auth, service } = setup();
  const state = await service.create(options);
  let finish: (value: unknown) => void;
  auth.requestAuthenticated.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const pending = service.invite({ worldId, receiverId: 'self' });
  await service.close({ instanceKey: state.instanceKey });
  expect(auth.requestAuthenticated).toHaveBeenCalledTimes(2);
  finish({ id: 'notification', type: 'invite', receiverUserId: userId });
  await pending;
});

it.each(['timeout', 'network', 'server'] as const)('retains an uncertain %s close and requires explicit retry', async code => {
  const { auth, service } = setup();
  const state = await service.create(options);
  auth.requestAuthenticated.mockRejectedValueOnce(new VRChatApiError(code));
  await service.close({ instanceKey: state.instanceKey });
  expect(service.list().instances[0]).toMatchObject({ closeStatus: 'unknown', closeError: { code } });
  await service.close({ instanceKey: state.instanceKey });
  expect(auth.requestAuthenticated).toHaveBeenCalledTimes(2);
  auth.requestAuthenticated.mockResolvedValueOnce({ ...reference, closedAt: new Date().toISOString() });
  await service.close({ instanceKey: state.instanceKey, retry: true });
  expect(service.list().instances[0].closeStatus).toBe('closed');
});

it.each([
  { ...reference },
  { ...reference, closedAt: 'invalid' },
  { ...reference, instanceId: '456', location: `${worldId}:456`, closedAt: new Date().toISOString() },
])('does not claim closure for an inconsistent response', async response => {
  const { auth, service } = setup();
  const state = await service.create(options);
  auth.requestAuthenticated.mockResolvedValueOnce(response);
  await service.close({ instanceKey: state.instanceKey });
  expect(service.list().instances[0].closeStatus).toBe('unknown');
});

it('returns a definite permission failure without removing the instance', async () => {
  const { auth, service } = setup();
  const state = await service.create(options);
  auth.requestAuthenticated.mockRejectedValueOnce(new VRChatApiError('forbidden'));
  await service.close({ instanceKey: state.instanceKey });
  expect(service.list().instances[0]).toMatchObject({ closeStatus: 'failed', closeError: { code: 'forbidden' } });
});

it.each([null, undefined, 'usr_someone_else'])('does not expose closure without authenticated ownership (%s)', async ownerId => {
  const { auth, service } = setup();
  auth.requestAuthenticated.mockResolvedValueOnce({ ...reference, ownerId });
  const state = await service.create(options);
  expect(service.list().instances[0].canClose).toBe(false);
  await expect(service.close({ instanceKey: state.instanceKey })).rejects.toMatchObject({ code: 'forbidden' });
  expect(auth.requestAuthenticated).toHaveBeenCalledTimes(1);
});

it('clears the history and discards pending close results on session changes', async () => {
  const { auth, service } = setup();
  const state = await service.create(options);
  let finish: (value: unknown) => void;
  auth.requestAuthenticated.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const pending = service.close({ instanceKey: state.instanceKey });
  auth.getSessionKey.mockReturnValue('session-2');
  expect(service.list().instances).toEqual([]);
  finish({ ...reference, closedAt: new Date().toISOString() });
  expect(await pending).toEqual({ loggedIn: true, instances: [] });
  auth.getSessionKey.mockReturnValue(undefined);
  expect(service.list()).toEqual({ loggedIn: false, instances: [] });
});

it('rejects unknown keys, mismatched worlds and invalid close inputs before sending', async () => {
  const { auth, service } = setup();
  const state = await service.create(options);
  await expect(service.close({ instanceKey: 'invalid' })).rejects.toMatchObject({ code: 'forbidden' });
  await expect(service.close({ instanceKey: state.instanceKey, retry: 'yes' as any })).rejects.toMatchObject({ code: 'invalidInput' });
  await expect(service.invite({ worldId, instanceKey: 'invalid', receiverId: 'self' })).rejects.toMatchObject({ code: 'invalidInput' });
  await expect(service.invite({ worldId: worldId.replace(/1$/, '2'), instanceKey: state.instanceKey, receiverId: 'self' })).rejects.toMatchObject({ code: 'invalidInput' });
  expect(auth.requestAuthenticated).toHaveBeenCalledTimes(1);
});
