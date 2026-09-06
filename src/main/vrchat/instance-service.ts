import type { VRChatAuthService } from './auth-service';
import { buildCreateInstanceRequest, buildSelfInvitePath, parseInstanceReference, parseInviteResponse, VRChatContractError } from './contracts';
import type { InstanceReference } from './contracts';
import { publicAuthError, VRChatApiError } from './errors';
import type { VRChatFriendsService } from './friends-service';

import type { CreateInstanceOptions, InstanceState } from 'src/types/vrchat-instance';
import type { InviteInput, InviteStatus } from 'src/types/vrchat-invite';

export class VRChatInstanceService {
  private sessionKey?: string;
  private states = new Map<string, InstanceState>();
  // Private location/nonce stay in main for subsequent invite operations.
  private references = new Map<string, InstanceReference>();

  constructor(private readonly auth: VRChatAuthService, private readonly friends?: VRChatFriendsService) {}

  private syncSession(): void {
    const key = this.auth.getSessionKey();
    if (key !== this.sessionKey) {
      this.states.clear();
      this.references.clear();
      this.sessionKey = key;
    }
  }

  private validateWorld(worldId: string): void {
    if (typeof worldId !== 'string' || !/^wrld_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(worldId)) {
      throw new VRChatApiError('invalidInput');
    }
  }

  getState(worldId: string): InstanceState {
    this.validateWorld(worldId);
    this.syncSession();
    return structuredClone(this.states.get(worldId) ?? { loggedIn: !!this.sessionKey, status: 'idle' });
  }

  reset(worldId: string): InstanceState {
    const state = this.getState(worldId);
    if (state.status === 'creating' || Object.values(state.invites ?? {}).some(invite => invite.status === 'sending')) return state;
    this.states.delete(worldId);
    this.references.delete(worldId);
    return this.getState(worldId);
  }

  async invite(input: InviteInput): Promise<InstanceState> {
    this.validateWorld(input?.worldId);
    if (typeof input.receiverId !== 'string' || (input.resend !== undefined && typeof input.resend !== 'boolean')) throw new VRChatApiError('invalidInput');
    const state = this.getState(input.worldId);
    const reference = this.references.get(input.worldId);
    const account = this.auth.getState();
    if (account.status !== 'authenticated' || state.status !== 'created' || !reference) throw new VRChatApiError('unauthorized');
    const self = input.receiverId === 'self';
    const friend = self ? undefined : this.friends?.getKnownFriend(input.receiverId);
    if (!self && !friend) throw new VRChatApiError('invalidInput');
    const receiverId = self ? account.user.id : friend.id;
    const receiverName = self ? '自分' : friend.displayName;
    const previous = state.invites?.[input.receiverId];
    if (Object.values(state.invites ?? {}).some(invite => invite.status === 'sending') ||
      (previous && ['sent', 'unknown'].includes(previous.status) && !input.resend)) return state;
    const session = this.sessionKey;
    const setInvite = (invite: InviteStatus) => {
      const current = this.states.get(input.worldId);
      this.states.set(input.worldId, { ...current, invites: { ...current.invites, [input.receiverId]: invite } });
    };
    setInvite({ status: 'sending', receiverName });
    try {
      const response = await this.auth.requestAuthenticated(self ? buildSelfInvitePath(reference) : `/invite/${encodeURIComponent(receiverId)}`, {
        method: 'POST', retry: false,
        ...(self ? {} : { body: { instanceId: reference.location } }),
      });
      this.syncSession();
      if (session !== this.sessionKey) return this.getState(input.worldId);
      parseInviteResponse(response, receiverId);
      setInvite({ status: 'sent', receiverName });
    } catch (error) {
      this.syncSession();
      if (session !== this.sessionKey) return this.getState(input.worldId);
      const safeError = publicAuthError(error);
      const unknown = ['network', 'timeout', 'server', 'invalidResponse', 'unexpected'].includes(safeError.code);
      setInvite({ status: unknown ? 'unknown' : 'failed', receiverName, error: safeError });
    }
    return this.getState(input.worldId);
  }

  async create(options: CreateInstanceOptions): Promise<InstanceState> {
    this.validateWorld(options?.worldId);
    const previous = this.getState(options.worldId);
    if (['creating', 'created', 'unknown'].includes(previous.status)) return previous;
    const authState = this.auth.getState();
    if (authState.status !== 'authenticated') return { loggedIn: false, status: 'idle', error: { code: 'unauthorized' } };
    let request;
    try { request = buildCreateInstanceRequest(options, authState.user.id); }
    catch {
      const failed: InstanceState = { loggedIn: true, status: 'failed', error: { code: 'invalidInput' } };
      this.states.set(options.worldId, failed);
      return structuredClone(failed);
    }
    const key = this.sessionKey;
    const safeOptions: CreateInstanceOptions = { worldId: request.worldId, access: options.access, region: request.region };
    this.states.set(options.worldId, { loggedIn: true, status: 'creating', options: safeOptions });
    try {
      const response = await this.auth.requestAuthenticated('/instances', { method: 'POST', body: request, retry: false });
      this.syncSession();
      if (key !== this.sessionKey) return this.getState(options.worldId);
      const reference = parseInstanceReference(response, options.worldId);
      this.references.set(options.worldId, reference);
      this.states.set(options.worldId, { loggedIn: true, status: 'created', options: safeOptions, createdAt: new Date().toISOString() });
    } catch (error) {
      this.syncSession();
      if (key !== this.sessionKey) return this.getState(options.worldId);
      const safeError = publicAuthError(error);
      const uncertain = error instanceof VRChatContractError || ['network', 'timeout', 'server', 'invalidResponse', 'unexpected'].includes(safeError.code);
      this.states.set(options.worldId, { loggedIn: true, status: uncertain ? 'unknown' : 'failed', options: safeOptions, error: safeError });
    }
    return this.getState(options.worldId);
  }
}
