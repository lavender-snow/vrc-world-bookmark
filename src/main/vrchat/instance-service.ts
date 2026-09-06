import type { VRChatAuthService } from './auth-service';
import { buildCreateInstanceRequest, parseInstanceReference, VRChatContractError } from './contracts';
import type { InstanceReference } from './contracts';
import { publicAuthError, VRChatApiError } from './errors';

import type { CreateInstanceOptions, InstanceState } from 'src/types/vrchat-instance';

export class VRChatInstanceService {
  private sessionKey?: string;
  private states = new Map<string, InstanceState>();
  // Private location/nonce stay in main for subsequent invite operations.
  private references = new Map<string, InstanceReference>();

  constructor(private readonly auth: VRChatAuthService) {}

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
    if (state.status === 'creating') return state;
    this.states.delete(worldId);
    this.references.delete(worldId);
    return this.getState(worldId);
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
