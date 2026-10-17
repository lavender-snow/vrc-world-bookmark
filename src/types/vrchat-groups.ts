import type { AuthError } from './vrchat-auth';
import type { InstanceState } from './vrchat-instance';

export interface GroupMember { id: string; displayName: string }
export interface FriendGroup { id: string; name: string; members: GroupMember[] }
export type GroupList = { ok: true; accountId: string | null; groups: FriendGroup[] } | { ok: false; error: AuthError };
export interface SaveGroupInput { accountId: string; id?: string; name: string; memberIds: string[] }
export interface DeleteGroupInput { accountId: string; id: string }
export interface GroupInviteInput { worldId: string; instanceKey: string; groupId: string; retryUnknown?: boolean }
export interface GroupInviteProgress {
  groupName: string;
  members: GroupMember[];
  status: 'sending' | 'completed' | 'stopped';
  cancelRequested?: boolean;
  error?: AuthError;
}
export interface VRChatGroupsAPI {
  list(): Promise<GroupList>;
  save(input: SaveGroupInput): Promise<GroupList>;
  remove(input: DeleteGroupInput): Promise<GroupList>;
  send(input: GroupInviteInput): Promise<InstanceState>;
  cancel(instanceKey: string): Promise<InstanceState>;
}
