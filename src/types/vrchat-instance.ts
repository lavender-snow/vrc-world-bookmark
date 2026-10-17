import type { AuthError } from './vrchat-auth';
import type { GroupInviteProgress } from './vrchat-groups';
import type { InviteStatus } from './vrchat-invite';

export type InstanceAccess = 'public' | 'friendsPlus' | 'friends' | 'invitePlus' | 'invite';
export type InstanceRegion = 'jp' | 'us' | 'use' | 'eu';
export interface CreateInstanceOptions { worldId: string; access: InstanceAccess; region: InstanceRegion; inviteSelf?: boolean; worldName?: string }
export type InstanceState = {
  loggedIn: boolean;
  status: 'idle' | 'creating' | 'created' | 'failed' | 'unknown';
  options?: CreateInstanceOptions;
  createdAt?: string;
  error?: AuthError;
  invites?: Record<string, InviteStatus>;
  groupInvite?: GroupInviteProgress;
  instanceKey?: string;
  closeStatus?: 'closing' | 'closed' | 'failed' | 'unknown';
  closeError?: AuthError;
};
export interface CreatedInstance extends InstanceState { instanceKey: string; options: CreateInstanceOptions; createdAt: string; canClose: boolean }
export interface CreatedInstanceList { loggedIn: boolean; instances: CreatedInstance[] }
export interface CloseInstanceInput { instanceKey: string; retry?: boolean }
export interface VRChatInstanceAPI {
  getState(worldId: string): Promise<InstanceState>;
  create(options: CreateInstanceOptions): Promise<InstanceState>;
  reset(worldId: string): Promise<InstanceState>;
  list(): Promise<CreatedInstanceList>;
  close(input: CloseInstanceInput): Promise<CreatedInstanceList>;
}
