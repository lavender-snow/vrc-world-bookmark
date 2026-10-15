import { randomUUID } from 'node:crypto';

import type { VRChatAuthService } from './auth-service';
import { buildCreateInstanceRequest, buildSelfInvitePath, parseInstanceReference, parseInviteResponse, VRChatContractError } from './contracts';
import type { InstanceReference } from './contracts';
import { publicAuthError, VRChatApiError } from './errors';
import type { VRChatFriendsService } from './friends-service';

import type { CloseInstanceInput, CreatedInstance, CreatedInstanceList, CreateInstanceOptions, InstanceState } from 'src/types/vrchat-instance';
import type { InviteInput, InviteStatus } from 'src/types/vrchat-invite';

export class VRChatInstanceService {
  private sessionKey?: string;
  private states = new Map<string, InstanceState>();
  // Private location/nonce stay in main for subsequent invite operations.
  private references = new Map<string, InstanceReference>();
  private created = new Map<string, { state: CreatedInstance; reference: InstanceReference }>();

  constructor(private readonly auth: VRChatAuthService, private readonly friends?: VRChatFriendsService) {}

  private syncSession(): void {
    const key = this.auth.getSessionKey();
    if (key !== this.sessionKey) {
      this.states.clear();
      this.references.clear();
      this.created.clear();
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

  list(): CreatedInstanceList {
    this.syncSession();
    return structuredClone({ loggedIn: !!this.sessionKey, instances: [...this.created.values()].map(entry => entry.state).reverse() });
  }

  private updateCreated(state: CreatedInstance): void {
    const entry = this.created.get(state.instanceKey);
    entry.state = state;
    if (this.states.get(state.options.worldId)?.instanceKey === state.instanceKey) this.states.set(state.options.worldId, state);
  }

  reset(worldId: string): InstanceState {
    const state = this.getState(worldId);
    if (state.status === 'creating' || state.closeStatus === 'closing' || Object.values(state.invites ?? {}).some(invite => invite.status === 'sending')) return state;
    this.states.delete(worldId);
    this.references.delete(worldId);
    return this.getState(worldId);
  }

  async invite(input: InviteInput): Promise<InstanceState> {
    this.validateWorld(input?.worldId);
    if (typeof input.receiverId !== 'string' || (input.resend !== undefined && typeof input.resend !== 'boolean')) throw new VRChatApiError('invalidInput');
    this.syncSession();
    if (input.instanceKey !== undefined && (typeof input.instanceKey !== 'string' || !this.created.has(input.instanceKey))) throw new VRChatApiError('invalidInput');
    const entry = input.instanceKey ? this.created.get(input.instanceKey) : undefined;
    const state = entry?.state ?? this.getState(input.worldId);
    const reference = entry?.reference ?? this.references.get(input.worldId);
    if (state.options?.worldId !== input.worldId) throw new VRChatApiError('invalidInput');
    if (['closing', 'closed', 'unknown'].includes(state.closeStatus)) throw new VRChatApiError('invalidInput');
    const account = this.auth.getState();
    if (account.status !== 'authenticated' || state.status !== 'created' || !reference) throw new VRChatApiError('unauthorized');
    const self = input.receiverId === 'self';
    const friend = self ? undefined : this.friends?.getKnownFriend(input.receiverId);
    if (!self && !friend) throw new VRChatApiError('invalidInput');
    const receiverId = self ? account.user.id : friend.id;
    const receiverName = self ? '自分' : friend.displayName;
    const previous = state.invites?.[input.receiverId];
    if (Object.values(state.invites ?? {}).some(invite => invite.status === 'sending') ||
      (previous && ['sent', 'unknown'].includes(previous.status) && !input.resend)) return structuredClone(state);
    const session = this.sessionKey;
    const instanceKey = state.instanceKey;
    const setInvite = (invite: InviteStatus) => {
      const current = this.created.get(instanceKey).state;
      this.updateCreated({ ...current, invites: { ...current.invites, [input.receiverId]: invite } });
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
    return structuredClone(this.created.get(instanceKey).state);
  }

  async create(options: CreateInstanceOptions): Promise<InstanceState> {
    this.validateWorld(options?.worldId);
    const previous = this.getState(options.worldId);
    if (['creating', 'created', 'unknown'].includes(previous.status)) return previous;
    const authState = this.auth.getState();
    if (authState.status !== 'authenticated') return { loggedIn: false, status: 'idle', error: { code: 'unauthorized' } };
    let request;
    try {
      if (options.inviteSelf !== undefined && typeof options.inviteSelf !== 'boolean') throw new VRChatApiError('invalidInput');
      if (options.worldName !== undefined && (typeof options.worldName !== 'string' || options.worldName.length > 500)) throw new VRChatApiError('invalidInput');
      request = buildCreateInstanceRequest(options, authState.user.id);
    }
    catch {
      const failed: InstanceState = { loggedIn: true, status: 'failed', error: { code: 'invalidInput' } };
      this.states.set(options.worldId, failed);
      return structuredClone(failed);
    }
    const key = this.sessionKey;
    const safeOptions: CreateInstanceOptions = { worldId: request.worldId, access: options.access, region: request.region, ...(options.worldName !== undefined ? { worldName: options.worldName } : {}) };
    this.states.set(options.worldId, { loggedIn: true, status: 'creating', options: safeOptions });
    try {
      const response = await this.auth.requestAuthenticated('/instances', { method: 'POST', body: request, retry: false });
      this.syncSession();
      if (key !== this.sessionKey) return this.getState(options.worldId);
      const reference = parseInstanceReference(response, options.worldId);
      this.references.set(options.worldId, reference);
      const state: CreatedInstance = { loggedIn: true, status: 'created', options: safeOptions, createdAt: new Date().toISOString(), instanceKey: randomUUID(), canClose: (response as Record<string, unknown>).ownerId === authState.user.id };
      this.states.set(options.worldId, state);
      this.created.set(state.instanceKey, { state, reference });
    } catch (error) {
      this.syncSession();
      if (key !== this.sessionKey) return this.getState(options.worldId);
      const safeError = publicAuthError(error);
      const uncertain = error instanceof VRChatContractError || ['network', 'timeout', 'server', 'invalidResponse', 'unexpected'].includes(safeError.code);
      this.states.set(options.worldId, { loggedIn: true, status: uncertain ? 'unknown' : 'failed', options: safeOptions, error: safeError });
    }
    // Keep invitation failures separate from creation, and continue even if the modal closes.
    if (options.inviteSelf && this.getState(options.worldId).status === 'created') {
      return this.invite({ worldId: options.worldId, receiverId: 'self' });
    }
    return this.getState(options.worldId);
  }

  async close(input: CloseInstanceInput): Promise<CreatedInstanceList> {
    this.syncSession();
    if (typeof input?.instanceKey !== 'string' || (input.retry !== undefined && typeof input.retry !== 'boolean')) throw new VRChatApiError('invalidInput');
    const entry = this.created.get(input.instanceKey);
    if (!entry || !entry.state.canClose || !this.sessionKey) throw new VRChatApiError('forbidden');
    const state = entry.state;
    if (['closing', 'closed'].includes(state.closeStatus) || Object.values(state.invites ?? {}).some(invite => invite.status === 'sending') ||
      (state.closeStatus === 'unknown' && !input.retry)) return this.list();
    const session = this.sessionKey;
    this.updateCreated({ ...state, closeStatus: 'closing', closeError: undefined });
    try {
      const response = await this.auth.requestAuthenticated(`/instances/${encodeURIComponent(entry.reference.worldId)}:${encodeURIComponent(entry.reference.instanceId)}`, { method: 'DELETE', retry: false });
      this.syncSession();
      if (session !== this.sessionKey) return this.list();
      const reference = parseInstanceReference(response, state.options.worldId);
      const closedAt = (response as Record<string, unknown>).closedAt;
      if (reference.location !== entry.reference.location || typeof closedAt !== 'string' || !Number.isFinite(Date.parse(closedAt))) throw new VRChatContractError('closedAt');
      this.updateCreated({ ...entry.state, closeStatus: 'closed', closeError: undefined });
    } catch (error) {
      this.syncSession();
      if (session !== this.sessionKey) return this.list();
      const safeError = publicAuthError(error);
      const uncertain = ['network', 'timeout', 'server', 'invalidResponse', 'unexpected'].includes(safeError.code);
      this.updateCreated({ ...entry.state, closeStatus: uncertain ? 'unknown' : 'failed', closeError: safeError });
    }
    return this.list();
  }
}
