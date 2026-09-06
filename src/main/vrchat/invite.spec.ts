/** @jest-environment node */
import type { VRChatAuthService } from './auth-service';
import { VRChatApiError } from './errors';
import { VRChatFriendsService } from './friends-service';
import { VRChatInstanceService } from './instance-service';

const userId = 'usr_00000000-0000-0000-0000-000000000001';
const friendId = 'usr_00000000-0000-0000-0000-000000000002';
const worldId = 'wrld_00000000-0000-0000-0000-000000000001';
const reference = { worldId, instanceId: '123~private(nonce)', location: `${worldId}:123~private(nonce)` };
const friend = { id: friendId, displayName: 'Friend', location: 'secret-location' };
function setup() {
  const auth = {
    getSessionKey: jest.fn((): string | undefined => 'session-1'),
    getState: jest.fn(() => ({ status: 'authenticated', user: { id: userId } })),
    requestAuthenticated: jest.fn().mockResolvedValue(reference),
  };
  const friends = new VRChatFriendsService(auth as unknown as VRChatAuthService);
  const instances = new VRChatInstanceService(auth as unknown as VRChatAuthService, friends);
  return { auth, friends, instances };
}
async function create(instances: VRChatInstanceService) {
  await instances.create({ worldId, access: 'invitePlus', region: 'jp' });
}

it('sends self invites using the retained reference and prevents duplicate successful sends', async () => {
  const { auth, instances } = setup();
  await create(instances);
  auth.requestAuthenticated.mockResolvedValue({ id: 'notification', type: 'invite', receiverUserId: userId });
  expect(await instances.invite({ worldId, receiverId: 'self' })).toMatchObject({ status: 'created', invites: { self: { status: 'sent' } } });
  expect(auth.requestAuthenticated).toHaveBeenLastCalledWith(`/invite/myself/to/${worldId}:123~private(nonce)`, { method: 'POST', retry: false });
  await instances.invite({ worldId, receiverId: 'self' });
  expect(auth.requestAuthenticated).toHaveBeenCalledTimes(2);
});

it('only invites a loaded friend and sends the complete location', async () => {
  const { auth, instances, friends } = setup();
  await create(instances);
  await expect(instances.invite({ worldId, receiverId: friendId })).rejects.toMatchObject({ code: 'invalidInput' });
  auth.requestAuthenticated.mockResolvedValueOnce([friend]).mockResolvedValueOnce({ id: 'notification', type: 'invite', receiverUserId: friendId });
  await friends.list({ offline: false, offset: 0 });
  const state = await instances.invite({ worldId, receiverId: friendId });
  expect(state.invites[friendId].status).toBe('sent');
  expect(auth.requestAuthenticated).toHaveBeenLastCalledWith(`/invite/${friendId}`, { method: 'POST', retry: false, body: { instanceId: reference.location } });
  expect(JSON.stringify(state)).not.toContain('nonce');
});

it('retains the instance on timeout and requires explicit resend', async () => {
  const { auth, instances } = setup();
  await create(instances);
  auth.requestAuthenticated.mockRejectedValueOnce(new VRChatApiError('timeout'));
  const state = await instances.invite({ worldId, receiverId: 'self' });
  expect(state).toMatchObject({ status: 'created', invites: { self: { status: 'unknown' } } });
  await instances.invite({ worldId, receiverId: 'self' });
  expect(auth.requestAuthenticated).toHaveBeenCalledTimes(2);
  auth.requestAuthenticated.mockResolvedValueOnce({ id: 'n', type: 'invite', receiverUserId: userId });
  expect((await instances.invite({ worldId, receiverId: 'self', resend: true })).invites.self.status).toBe('sent');
  expect(auth.requestAuthenticated.mock.calls.filter(call => call[0] === '/instances')).toHaveLength(1);
});

it('blocks reset and overlapping sends while pending, then discards a stale-session response', async () => {
  const { auth, instances } = setup();
  await create(instances);
  let finish: (value: unknown) => void;
  auth.requestAuthenticated.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const pending = instances.invite({ worldId, receiverId: 'self' });
  expect(instances.reset(worldId).invites.self.status).toBe('sending');
  await instances.invite({ worldId, receiverId: 'self' });
  expect(auth.requestAuthenticated).toHaveBeenCalledTimes(2);
  auth.getSessionKey.mockReturnValue(undefined);
  finish({ id: 'n', type: 'invite', receiverUserId: userId });
  expect(await pending).toEqual({ status: 'idle', loggedIn: false });
});

it('does not claim success for an inconsistent notification', async () => {
  const { auth, instances } = setup();
  await create(instances);
  auth.requestAuthenticated.mockResolvedValueOnce({ id: 'n', type: 'friendRequest', receiverUserId: userId });
  expect((await instances.invite({ worldId, receiverId: 'self' })).invites.self.status).toBe('unknown');
});

it('pages and caches friend summaries without returning private fields', async () => {
  const { auth, friends } = setup();
  auth.requestAuthenticated.mockResolvedValue([friend]);
  const page = await friends.list({ offline: false, offset: 0 });
  expect(page).toEqual({ ok: true, hasMore: false, friends: [{ id: friendId, displayName: 'Friend', offline: false }] });
  await friends.list({ offline: false, offset: 0 });
  expect(auth.requestAuthenticated).toHaveBeenCalledTimes(1);
  await friends.list({ offline: true, offset: 100 });
  expect(auth.requestAuthenticated).toHaveBeenLastCalledWith('/auth/user/friends?offline=true&offset=100&n=100', {});
  auth.getSessionKey.mockReturnValue('session-2');
  expect(friends.getKnownFriend(friendId)).toBeUndefined();
});

it('discards pending friend lists on account changes and rejects invalid pages', async () => {
  const { auth, friends } = setup();
  expect(await friends.list({ offline: false, offset: -1 })).toMatchObject({ ok: false });
  let finish: (value: unknown) => void;
  auth.requestAuthenticated.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const pending = friends.list({ offline: false, offset: 0 });
  auth.getSessionKey.mockReturnValue('session-2');
  finish([friend]);
  expect(await pending).toMatchObject({ ok: false, error: { code: 'cancelled' } });
  expect(friends.getKnownFriend(friendId)).toBeUndefined();
});
