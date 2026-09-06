import type { RequestOptions, SessionClient } from './client';
import { parseAuthResponse, parseTwoFactorVerification, twoFactorVerifyPath } from './contracts';
import { publicAuthError, VRChatApiError } from './errors';
import type { SessionStore } from './session-store';

import type { AuthResult, AuthState, LoginInput, TwoFactorInput } from 'src/types/vrchat-auth';

export class VRChatAuthService {
  private state: AuthState = { status: 'signedOut', persistence: 'none' };
  private client: SessionClient;
  private active?: AbortController;
  private generation = 0;
  private blockedUntil = 0;
  private twoFactorVerified = false;
  private sessionEpoch = 0;

  getSessionKey(): string | undefined {
    return this.state.status === 'authenticated' ? `${this.sessionEpoch}:${this.state.user.id}` : undefined;
  }

  async requestAuthenticated(path: string, options: RequestOptions): Promise<unknown> {
    if (this.active) throw new VRChatApiError('busy');
    const key = this.getSessionKey();
    if (!key) throw new VRChatApiError('unauthorized');
    this.checkCooldown();
    const client = this.client;
    try {
      const response = await client.request(path, options);
      if (this.getSessionKey() !== key) throw new VRChatApiError('cancelled');
      try {
        this.state.persistence = this.store.save(client.exportCookies()) ? 'saved' : 'memory';
      } catch { this.state.persistence = 'memory'; }
      if (this.state.persistence === 'memory') this.state.error = { code: 'storage' };
      return response;
    } catch (error) {
      if (this.getSessionKey() !== key) throw new VRChatApiError('cancelled');
      if (error instanceof VRChatApiError && error.code === 'unauthorized') {
        this.sessionEpoch++;
        this.state = { status: 'expired', persistence: 'none' };
        this.client = this.createClient();
        try { this.store.clear(); } catch { this.state.error = { code: 'storage' }; }
      }
      throw error;
    }
  }

  constructor(private readonly createClient: () => SessionClient, private readonly store: SessionStore) {
    this.client = createClient();
  }

  getState(): AuthState {
    return structuredClone(this.state);
  }

  private async run(work: (signal: AbortSignal, generation: number) => Promise<void>): Promise<AuthResult> {
    if (this.active) return { ok: false, state: this.getState(), error: { code: 'busy' } };
    const controller = new AbortController();
    this.active = controller;
    const generation = this.generation;
    try {
      await work(controller.signal, generation);
      this.assertCurrent(generation);
      return { ok: true, state: this.getState() };
    } catch (error) {
      const safeError = generation === this.generation ? publicAuthError(error) : { code: 'cancelled' as const };
      if (generation === this.generation) {
        if (safeError.code === 'rateLimited') this.blockedUntil = Date.now() + (safeError.retryAfterMs ?? 1000);
        this.state = { ...this.state, error: safeError };
      }
      return { ok: false, state: this.getState(), error: safeError };
    } finally {
      if (this.active === controller) this.active = undefined;
    }
  }

  private assertCurrent(generation: number): void {
    if (generation !== this.generation) throw new VRChatApiError('cancelled');
  }

  private checkCooldown(): void {
    if (Date.now() < this.blockedUntil) throw new VRChatApiError('rateLimited', this.blockedUntil - Date.now());
  }

  private accept(value: unknown, generation: number): void {
    this.assertCurrent(generation);
    const response = parseAuthResponse(value);
    this.twoFactorVerified = false;
    this.state = response.kind === 'authenticated'
      ? { status: 'authenticated', user: response.user, persistence: 'memory' }
      : { status: 'twoFactorRequired', methods: response.methods, persistence: 'memory' };
    // Only persist a fully verified session, never a pending challenge.
    if (response.kind === 'authenticated') {
      try {
        this.state.persistence = this.store.save(this.client.exportCookies()) ? 'saved' : 'memory';
        if (this.state.persistence === 'memory') this.state.error = { code: 'storage' };
      } catch {
        this.state.error = { code: 'storage' };
      }
    }
  }

  restoreSession(): Promise<AuthResult> {
    return this.run(async (signal, generation) => {
      if (this.state.status === 'authenticated' || this.state.status === 'twoFactorRequired') return;
      this.checkCooldown();
      this.state = { status: 'restoring', persistence: 'none' };
      try {
        const saved = this.store.load();
        if (saved === null) {
          this.state = { status: 'signedOut', persistence: 'none' };
          return;
        }
        this.client = this.createClient();
        this.client.importCookies(saved);
        const response = await this.client.request('/auth/user', { signal });
        this.accept(response, generation);
      } catch (error) {
        this.assertCurrent(generation);
        if (error instanceof VRChatApiError && error.code === 'unauthorized') {
          this.client = this.createClient();
          this.state = { status: 'expired', persistence: 'none' };
          this.store.clear();
        } else {
          // A transport/storage failure is not proof that the saved session expired.
          this.state = { status: 'restoreFailed', persistence: 'none' };
        }
        throw error;
      }
    });
  }

  login(input: LoginInput): Promise<AuthResult> {
    return this.run(async (signal, generation) => {
      if (!input || typeof input.username !== 'string' || typeof input.password !== 'string' ||
        !input.username.trim() || !input.password || input.username.length > 1024 || input.password.length > 4096) {
        throw new VRChatApiError('invalidInput');
      }
      this.checkCooldown();
      // Failure to remove the old account's session must prevent switching accounts.
      this.store.clear();
      this.sessionEpoch++;
      this.client = this.createClient();
      this.twoFactorVerified = false;
      this.state = { status: 'loggingIn', persistence: 'none' };
      try {
        const authorization = `Basic ${Buffer.from(`${encodeURIComponent(input.username)}:${encodeURIComponent(input.password)}`, 'utf8').toString('base64')}`;
        const response = await this.client.request('/auth/user', { authorization, retry: false, signal });
        this.accept(response, generation);
      } catch (error) {
        this.assertCurrent(generation);
        this.state = { status: 'signedOut', persistence: 'none' };
        throw error;
      }
    });
  }

  verifyTwoFactor(input: TwoFactorInput): Promise<AuthResult> {
    return this.run(async (signal, generation) => {
      if (this.state.status !== 'twoFactorRequired' || !input ||
        !['totp', 'emailOtp'].includes(input.method) || !this.state.methods.includes(input.method) ||
        typeof input.code !== 'string' || !/^\d{6}$/.test(input.code)) throw new VRChatApiError('invalidInput');
      this.checkCooldown();
      if (!this.twoFactorVerified) {
        const verified = await this.client.request(twoFactorVerifyPath(input.method), {
          method: 'POST', body: { code: input.code }, retry: false, signal,
        });
        this.assertCurrent(generation);
        if (!parseTwoFactorVerification(verified)) throw new VRChatApiError('unauthorized');
        this.twoFactorVerified = true;
      }
      // If the follow-up GET fails, retry it without reusing a consumed OTP.
      const response = await this.client.request('/auth/user', { signal });
      this.accept(response, generation);
    });
  }

  logout(): Promise<AuthResult> {
    const previousClient = this.client;
    this.active?.abort();
    this.active = undefined;
    this.generation++;
    this.sessionEpoch++;
    this.client = this.createClient();
    this.twoFactorVerified = false;
    this.state = { status: 'signedOut', persistence: 'none' };
    return this.run(async (signal) => {
      // Local deletion always precedes the remote request, including when offline.
      this.store.clear();
      await previousClient.request('/logout', { method: 'PUT', retry: false, signal });
    });
  }
}
