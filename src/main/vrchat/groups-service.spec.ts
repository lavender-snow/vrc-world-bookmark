/** @jest-environment node */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { VRChatAuthService } from './auth-service';
import type { VRChatFriendsService } from './friends-service';
import { FileGroupStore } from './group-store';
import { VRChatGroupsService } from './groups-service';

const accountId = 'usr_00000000-0000-0000-0000-000000000001';
const otherId = 'usr_00000000-0000-0000-0000-000000000002';
const friendId = 'usr_00000000-0000-0000-0000-000000000003';
let directory: string;
beforeEach(() => { directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vrc-groups-test-')); });
afterEach(() => { fs.rmSync(directory, { recursive: true, force: true }); });

function setup() {
  const auth = { getState: jest.fn((): any => ({ status: 'authenticated', user: { id: accountId } })) };
  const friends = { getKnownFriend: jest.fn((id: string) => id === friendId ? { id, displayName: 'Alice', offline: false } : undefined) };
  const store = new FileGroupStore(directory);
  const service = new VRChatGroupsService(auth as unknown as VRChatAuthService, friends as unknown as VRChatFriendsService, store);
  return { auth, friends, store, service };
}

it('persists deduplicated members, supports rename/removal and reloads without the friend cache', () => {
  const { service, friends, store } = setup();
  const saved = service.save({ accountId, name: '  散歩仲間  ', memberIds: [friendId, friendId] });
  expect(saved).toMatchObject({ ok: true, groups: [{ name: '散歩仲間', members: [{ id: friendId, displayName: 'Alice' }] }] });
  const group = store.load(accountId)[0];
  expect(new FileGroupStore(directory).load(accountId)).toEqual([group]);
  friends.getKnownFriend.mockReturnValue(undefined);
  expect(service.save({ accountId, id: group.id, name: '週末', memberIds: [friendId] })).toMatchObject({ ok: true });
  expect(service.get(group.id).name).toBe('週末');
  expect(service.save({ accountId, id: group.id, name: '週末', memberIds: [] })).toMatchObject({ groups: [{ members: [] }] });
  expect(service.remove({ accountId, id: group.id })).toEqual({ ok: true, accountId, groups: [] });
});

it('isolates accounts and rejects writes from a stale account or signed out UI', () => {
  const { service, auth, store } = setup();
  service.save({ accountId, name: '仲間', memberIds: [friendId] });
  const original = store.load(accountId);
  auth.getState.mockReturnValue({ status: 'authenticated', user: { id: otherId } });
  expect(service.list()).toEqual({ ok: true, accountId: otherId, groups: [] });
  expect(() => service.get(original[0].id)).toThrow();
  expect(service.save({ accountId, name: '上書き', memberIds: [] })).toMatchObject({ ok: false, error: { code: 'cancelled' } });
  expect(service.remove({ accountId, id: original[0].id })).toMatchObject({ ok: false });
  auth.getState.mockReturnValue({ status: 'signedOut' });
  expect(service.list()).toEqual({ ok: true, accountId: null, groups: [] });
  expect(service.save({ accountId, name: '上書き', memberIds: [] })).toMatchObject({ ok: false, error: { code: 'unauthorized' } });
  expect(store.load(accountId)).toEqual(original);
});

it('rejects arbitrary recipients, malformed input and oversized groups without creating a file', () => {
  const { service, store } = setup();
  for (const input of [null, { accountId, name: ' ', memberIds: [] }, { accountId, name: 'a'.repeat(81), memberIds: [] },
    { accountId, name: '仲間', memberIds: [otherId] }, { accountId, name: '仲間', memberIds: ['../invalid'] },
    { accountId, name: '仲間', memberIds: Array(101).fill(friendId) }]) {
    expect(service.save(input)).toMatchObject({ ok: false, error: { code: 'invalidInput' } });
  }
  expect(store.load(accountId)).toEqual([]);
  expect(() => store.load('../invalid')).toThrow();
});

it('preserves corrupted data instead of overwriting it with an empty group list', () => {
  const { service } = setup();
  const file = path.join(directory, `${accountId}.json`);
  fs.writeFileSync(file, '{broken');
  expect(service.list()).toMatchObject({ ok: false, error: { code: 'storage' } });
  expect(service.save({ accountId, name: '仲間', memberIds: [] })).toMatchObject({ ok: false, error: { code: 'storage' } });
  expect(fs.readFileSync(file, 'utf8')).toBe('{broken');
});

it('reports failed persistence without changing the previous file', () => {
  const { service, store } = setup();
  service.save({ accountId, name: '仲間', memberIds: [friendId] });
  const original = store.load(accountId);
  const rename = jest.spyOn(fs, 'renameSync').mockImplementation(() => { throw new Error('disk'); });
  try {
    expect(service.save({ accountId, id: original[0].id, name: '変更', memberIds: [] })).toMatchObject({ ok: false, error: { code: 'storage' } });
    expect(store.load(accountId)).toEqual(original);
  } finally { rename.mockRestore(); }
});
