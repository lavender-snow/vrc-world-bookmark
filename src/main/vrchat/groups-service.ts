import { randomUUID } from 'node:crypto';

import type { VRChatAuthService } from './auth-service';
import { publicAuthError, VRChatApiError } from './errors';
import type { VRChatFriendsService } from './friends-service';
import { isUserId } from './group-store';
import type { GroupStore } from './group-store';

import type { DeleteGroupInput, FriendGroup, GroupList, SaveGroupInput } from 'src/types/vrchat-groups';

export class VRChatGroupsService {
  constructor(private readonly auth: VRChatAuthService, private readonly friends: VRChatFriendsService, private readonly store: GroupStore) {}

  private account(expected?: string): string {
    const state = this.auth.getState();
    if (state.status !== 'authenticated') throw new VRChatApiError('unauthorized');
    if (expected !== undefined && expected !== state.user.id) throw new VRChatApiError('cancelled');
    return state.user.id;
  }

  list(): GroupList {
    if (this.auth.getState().status !== 'authenticated') return { ok: true, accountId: null, groups: [] };
    try {
      const accountId = this.account();
      return { ok: true, accountId, groups: this.store.load(accountId) };
    } catch (error) { return { ok: false, error: publicAuthError(error) }; }
  }

  get(id: string): FriendGroup {
    if (typeof id !== 'string') throw new VRChatApiError('invalidInput');
    const group = this.store.load(this.account()).find(item => item.id === id);
    if (!group) throw new VRChatApiError('notFound');
    return structuredClone(group);
  }

  save(input: SaveGroupInput): GroupList {
    try {
      if (!input || !isUserId(input.accountId) || (input.id !== undefined && typeof input.id !== 'string') ||
        typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 80 ||
        !Array.isArray(input.memberIds) || input.memberIds.length > 100 || input.memberIds.some(id => !isUserId(id))) throw new VRChatApiError('invalidInput');
      const accountId = this.account(input.accountId);
      const groups = this.store.load(accountId);
      const previous = input.id === undefined ? undefined : groups.find(group => group.id === input.id);
      if (input.id !== undefined && !previous) throw new VRChatApiError('notFound');
      if (!previous && groups.length >= 100) throw new VRChatApiError('invalidInput');
      const members = [...new Set(input.memberIds)].map(id => {
        const friend = this.friends.getKnownFriend(id) ?? previous?.members.find(member => member.id === id);
        if (!friend) throw new VRChatApiError('invalidInput');
        return { id, displayName: friend.displayName };
      });
      const group: FriendGroup = { id: previous?.id ?? randomUUID(), name: input.name.trim(), members };
      const next = previous ? groups.map(item => item.id === group.id ? group : item) : [...groups, group];
      this.store.save(accountId, next);
      return { ok: true, accountId, groups: next };
    } catch (error) { return { ok: false, error: publicAuthError(error) }; }
  }

  remove(input: DeleteGroupInput): GroupList {
    try {
      if (!input || !isUserId(input.accountId) || typeof input.id !== 'string') throw new VRChatApiError('invalidInput');
      const accountId = this.account(input.accountId);
      const groups = this.store.load(accountId);
      if (!groups.some(group => group.id === input.id)) throw new VRChatApiError('notFound');
      const next = groups.filter(group => group.id !== input.id);
      this.store.save(accountId, next);
      return { ok: true, accountId, groups: next };
    } catch (error) { return { ok: false, error: publicAuthError(error) }; }
  }
}
