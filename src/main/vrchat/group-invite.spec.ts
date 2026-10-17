/** @jest-environment node */
import type { VRChatAuthService } from './auth-service';
import { VRChatApiError } from './errors';
import type { VRChatGroupsService } from './groups-service';
import { VRChatInstanceService } from './instance-service';

const userId = 'usr_00000000-0000-0000-0000-000000000001';
const worldId = 'wrld_00000000-0000-0000-0000-000000000001';
const members = [2, 3, 4].map(value => ({ id: `usr_00000000-0000-0000-0000-00000000000${value}`, displayName: `Friend ${value}` }));
const reference = { worldId, instanceId: '123~private(nonce)', location: `${worldId}:123~private(nonce)`, ownerId: userId };
const notification = (id: string) => ({ id: 'notification', type: 'invite', receiverUserId: id });

async function setup(pause = jest.fn(async () => {})) {
  const auth = {
    getSessionKey: jest.fn((): string | undefined => 'session-1'),
    getState: jest.fn(() => ({ status: 'authenticated', user: { id: userId } })),
    requestAuthenticated: jest.fn().mockResolvedValue(reference),
  };
  const groups = { get: jest.fn(() => ({ id: 'group', name: '仲間', members: structuredClone(members) })) };
  const instances = new VRChatInstanceService(auth as unknown as VRChatAuthService, undefined, groups as unknown as VRChatGroupsService, pause);
  const state = await instances.create({ worldId, access: 'invitePlus', region: 'jp' });
  auth.requestAuthenticated.mockImplementation(async (url: string) => notification(url.split('/').pop()));
  const input = { worldId, instanceKey: state.instanceKey, groupId: 'group' };
  return { auth, groups, instances, input, pause };
}

async function settle(instances: VRChatInstanceService) {
  for (let i = 0; i < 50 && instances.getState(worldId).groupInvite?.status === 'sending'; i++) await Promise.resolve();
  expect(instances.getState(worldId).groupInvite?.status).not.toBe('sending');
  return instances.getState(worldId);
}

it('sends each saved member sequentially, retains results and never repeats successful recipients', async () => {
  const { instances, auth, input, pause } = await setup();
  instances.inviteGroup(input);
  const state = await settle(instances);
  expect(Object.values(state.invites).map(invite => invite.status)).toEqual(['sent', 'sent', 'sent']);
  expect(pause).toHaveBeenCalledTimes(2);
  expect(auth.requestAuthenticated.mock.calls.slice(1)).toEqual(members.map(member => [`/invite/${member.id}`, { method: 'POST', retry: false, body: { instanceId: reference.location } }]));
  expect(JSON.stringify(state)).not.toContain('nonce');
  instances.inviteGroup(input);
  await settle(instances);
  expect(auth.requestAuthenticated).toHaveBeenCalledTimes(4);
});

it('locks the instance between requests and allows stopping the remaining invitations', async () => {
  let release: () => void;
  const pause = jest.fn(() => new Promise<void>(resolve => { release = resolve; }));
  const { instances, auth, input } = await setup(pause);
  instances.inviteGroup(input);
  for (let i = 0; i < 10 && !release; i++) await Promise.resolve();
  expect(release).toBeDefined();
  expect(instances.reset(worldId).status).toBe('created');
  await instances.close({ instanceKey: input.instanceKey });
  expect(() => instances.inviteGroup(input)).toThrow();
  await expect(instances.invite({ worldId, receiverId: 'self' })).rejects.toMatchObject({ code: 'busy' });
  instances.cancelGroup(input.instanceKey);
  release();
  const state = await settle(instances);
  expect(state.groupInvite.status).toBe('stopped');
  expect(Object.keys(state.invites)).toEqual([members[0].id]);
  expect(auth.requestAuthenticated).toHaveBeenCalledTimes(2);
});

it('finishes the in-flight invite on cancel and discards the rest', async () => {
  const { instances, auth, input } = await setup();
  let release: (value: unknown) => void;
  auth.requestAuthenticated.mockReturnValueOnce(new Promise(resolve => { release = resolve; }));
  instances.inviteGroup(input);
  instances.cancelGroup(input.instanceKey);
  release(notification(members[0].id));
  const state = await settle(instances);
  expect(state.invites[members[0].id].status).toBe('sent');
  expect(state.groupInvite.status).toBe('stopped');
  expect(auth.requestAuthenticated).toHaveBeenCalledTimes(2);
});

it('stops on rate limits, then retries failed/unattempted members while preserving successes', async () => {
  const { instances, auth, input } = await setup();
  auth.requestAuthenticated.mockResolvedValueOnce(notification(members[0].id)).mockRejectedValueOnce(new VRChatApiError('rateLimited', 60000));
  instances.inviteGroup(input);
  const stopped = await settle(instances);
  expect(stopped.groupInvite).toMatchObject({ status: 'stopped', error: { code: 'rateLimited', retryAfterMs: 60000 } });
  expect(stopped.invites[members[2].id]).toBeUndefined();
  instances.inviteGroup(input);
  const complete = await settle(instances);
  expect(Object.values(complete.invites).every(invite => invite.status === 'sent')).toBe(true);
  expect(auth.requestAuthenticated.mock.calls.filter(call => call[0] === `/invite/${members[0].id}`)).toHaveLength(1);
});

it('requires explicit acknowledgement to retry unknown results and continues past a forbidden member', async () => {
  const { instances, auth, input } = await setup();
  auth.requestAuthenticated.mockRejectedValueOnce(new VRChatApiError('timeout'));
  instances.inviteGroup(input);
  expect((await settle(instances)).invites[members[0].id].status).toBe('unknown');
  auth.requestAuthenticated.mockRejectedValueOnce(new VRChatApiError('forbidden'));
  instances.inviteGroup(input);
  const state = await settle(instances);
  expect(state.invites[members[0].id].status).toBe('unknown');
  expect(state.invites[members[1].id].status).toBe('failed');
  expect(state.invites[members[2].id].status).toBe('sent');
  instances.inviteGroup({ ...input, retryUnknown: true });
  expect(Object.values((await settle(instances)).invites).every(invite => invite.status === 'sent')).toBe(true);
});

it('discards old-session responses and stops sending on account changes', async () => {
  const { instances, auth, input } = await setup();
  let release: (value: unknown) => void;
  auth.requestAuthenticated.mockReturnValueOnce(new Promise(resolve => { release = resolve; }));
  instances.inviteGroup(input);
  auth.getSessionKey.mockReturnValue('session-2');
  release(notification(members[0].id));
  for (let i = 0; i < 10; i++) await Promise.resolve();
  expect(instances.list().instances).toEqual([]);
  expect(auth.requestAuthenticated).toHaveBeenCalledTimes(2);
});

it('targets the selected instance even when another instance exists for the same world', async () => {
  const { instances, auth, input } = await setup();
  instances.reset(worldId);
  auth.requestAuthenticated.mockResolvedValueOnce({ ...reference, instanceId: '456', location: `${worldId}:456` });
  await instances.create({ worldId, access: 'invitePlus', region: 'jp' });
  instances.inviteGroup(input);
  for (let i = 0; i < 30; i++) await Promise.resolve();
  expect(instances.getState(worldId).invites).toBeUndefined();
  expect(instances.list().instances.find(item => item.instanceKey === input.instanceKey).groupInvite.status).toBe('completed');
  expect(auth.requestAuthenticated.mock.calls.filter(call => call[0].startsWith('/invite/')).every(call => call[1].body.instanceId === reference.location)).toBe(true);
});

it('rejects empty groups, mismatched worlds and closed instances before sending', async () => {
  const { instances, auth, groups, input } = await setup();
  groups.get.mockReturnValueOnce({ id: 'group', name: '空', members: [] });
  expect(() => instances.inviteGroup(input)).toThrow();
  expect(() => instances.inviteGroup({ ...input, worldId: 'wrld_00000000-0000-0000-0000-000000000002' })).toThrow();
  auth.requestAuthenticated.mockResolvedValueOnce({ ...reference, closedAt: '2026-10-18T00:00:00Z' });
  await instances.close({ instanceKey: input.instanceKey });
  expect(() => instances.inviteGroup(input)).toThrow();
  expect(auth.requestAuthenticated).toHaveBeenCalledTimes(2);
});
