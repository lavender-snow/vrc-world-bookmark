import type { AuthError } from './vrchat-auth';

export type InstanceAccess = 'public' | 'friendsPlus' | 'friends' | 'invitePlus' | 'invite';
export type InstanceRegion = 'jp' | 'us' | 'use' | 'eu';
export interface CreateInstanceOptions { worldId: string; access: InstanceAccess; region: InstanceRegion }
export type InstanceState = {
  loggedIn: boolean;
  status: 'idle' | 'creating' | 'created' | 'failed' | 'unknown';
  options?: CreateInstanceOptions;
  createdAt?: string;
  error?: AuthError;
};
export interface VRChatInstanceAPI {
  getState(worldId: string): Promise<InstanceState>;
  create(options: CreateInstanceOptions): Promise<InstanceState>;
  reset(worldId: string): Promise<InstanceState>;
}
