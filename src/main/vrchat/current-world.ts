import type { VRChatAuthService } from './auth-service';
import { parseAuthResponse, parseInstanceReference, VRChatContractError } from './contracts';
import { publicAuthError, VRChatApiError } from './errors';

import type { CurrentWorldResult } from 'src/types/vrchat-world';

function unavailable(value: unknown): boolean {
  return value === undefined || value === null || value === '' ||
    value === 'offline' || value === 'private' || value === 'traveling';
}

/** Fetch on demand; never use a cached login location or a travel destination. */
export async function getCurrentWorld(auth: VRChatAuthService): Promise<CurrentWorldResult> {
  const state = auth.getState();
  if (state.status !== 'authenticated') return { ok: false, error: { code: 'unauthorized' } };
  const session = auth.getSessionKey();
  try {
    const response = await auth.requestAuthenticated('/auth/user', {});
    if (session !== auth.getSessionKey()) throw new VRChatApiError('cancelled');
    const account = parseAuthResponse(response);
    if (account.kind !== 'authenticated' || account.user.id !== state.user.id) throw new VRChatApiError('unauthorized');
    const { presence, location } = response as Record<string, unknown>;
    // CurrentUser supplies its live world in presence; location may be absent or offline.
    // An explicit unavailable presence must not fall back to an older location.
    if (presence !== undefined && presence !== null) {
      if (typeof presence !== 'object' || Array.isArray(presence)) throw new VRChatContractError('presence');
      const current = presence as Record<string, unknown>;
      if (current.id !== undefined && current.id !== state.user.id) throw new VRChatApiError('unauthorized');
      if ('world' in current) {
        if (unavailable(current.world)) return { ok: false, error: { code: 'notInWorld' } };
        if (typeof current.world !== 'string' || !/^wrld_[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(current.world)) {
          throw new VRChatContractError('presence.world');
        }
        return { ok: true, worldId: current.world };
      }
    }
    if (unavailable(location)) {
      return { ok: false, error: { code: 'notInWorld' } };
    }
    if (typeof location !== 'string') throw new VRChatContractError('location');
    const separator = location.indexOf(':');
    const reference = parseInstanceReference({
      worldId: location.slice(0, separator), instanceId: location.slice(separator + 1), location,
    }, location.slice(0, separator));
    // Only the world ID crosses IPC. Private instance IDs and account details stay in main.
    return { ok: true, worldId: reference.worldId };
  } catch (error) {
    return { ok: false, error: publicAuthError(error) };
  }
}
