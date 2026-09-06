import type { VRChatAuthService } from './auth-service';
import { publicAuthError, VRChatApiError } from './errors';

import type { FriendPage, FriendPageInput, FriendSummary } from 'src/types/vrchat-invite';

export class VRChatFriendsService {
  private sessionKey?: string;
  private pages = new Map<string, { at: number; data: Extract<FriendPage, { ok: true }> }>();
  private pending = new Map<string, Promise<FriendPage>>();
  constructor(private readonly auth: VRChatAuthService) {}

  private sync() {
    const key = this.auth.getSessionKey();
    if (key !== this.sessionKey) { this.pages.clear(); this.pending.clear(); this.sessionKey = key; }
  }

  getKnownFriend(id: string): FriendSummary | undefined {
    this.sync();
    for (const page of this.pages.values()) {
      const friend = page.data.friends.find(item => item.id === id);
      if (friend) return { ...friend };
    }
  }

  async list(input: FriendPageInput): Promise<FriendPage> {
    this.sync();
    if (!this.sessionKey) return { ok: false, error: { code: 'unauthorized' } };
    if (!input || typeof input.offline !== 'boolean' || !Number.isSafeInteger(input.offset) || input.offset < 0) {
      return { ok: false, error: { code: 'invalidInput' } };
    }
    const pageKey = `${input.offline}:${input.offset}`;
    const cached = this.pages.get(pageKey);
    if (cached && Date.now() - cached.at < 30000) return structuredClone(cached.data);
    const pending = this.pending.get(pageKey);
    if (pending) return structuredClone(await pending);
    const session = this.sessionKey;
    const load = async (): Promise<FriendPage> => {
      try {
        const response = await this.auth.requestAuthenticated(`/auth/user/friends?offline=${input.offline}&offset=${input.offset}&n=100`, {});
        this.sync();
        if (session !== this.sessionKey) throw new VRChatApiError('cancelled');
        if (!Array.isArray(response) || response.length > 100) throw new VRChatApiError('invalidResponse');
        const friends = response.map((value: unknown): FriendSummary => {
          if (!value || typeof value !== 'object') throw new VRChatApiError('invalidResponse');
          const item = value as Record<string, unknown>;
          if (typeof item.id !== 'string' || !/^usr_[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(item.id) ||
            typeof item.displayName !== 'string' || !item.displayName.trim()) throw new VRChatApiError('invalidResponse');
          return { id: item.id, displayName: item.displayName, offline: input.offline };
        });
        const data = { ok: true as const, friends, hasMore: response.length === 100 };
        this.pages.set(pageKey, { at: Date.now(), data });
        return data;
      } catch (error) { return { ok: false, error: publicAuthError(error) }; }
    };
    const task = load();
    this.pending.set(pageKey, task);
    try { return structuredClone(await task); }
    finally { if (this.pending.get(pageKey) === task) this.pending.delete(pageKey); }
  }
}
