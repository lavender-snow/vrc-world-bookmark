import type { AuthError } from './vrchat-auth';
import type { InstanceState } from './vrchat-instance';

export interface FriendSummary { id: string; displayName: string; offline: boolean }
export interface FriendPageInput { offline: boolean; offset: number }
export type FriendPage = { ok: true; friends: FriendSummary[]; hasMore: boolean } | { ok: false; error: AuthError };
export interface InviteStatus {
  status: 'sending' | 'sent' | 'failed' | 'unknown';
  receiverName: string;
  error?: AuthError;
}
export interface InviteInput { worldId: string; receiverId: string; resend?: boolean; instanceKey?: string }
export interface VRChatInviteAPI {
  listFriends(input: FriendPageInput): Promise<FriendPage>;
  send(input: InviteInput): Promise<InstanceState>;
}
