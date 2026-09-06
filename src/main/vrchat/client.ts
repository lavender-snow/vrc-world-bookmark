import { CookieJar } from 'tough-cookie';

import { VRChatApiError } from './errors';

const API_BASE = 'https://api.vrchat.cloud/api/1';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT';
  body?: unknown;
  authorization?: string;
  retry?: boolean;
  signal?: AbortSignal;
}

export interface SessionClient {
  request(path: string, options?: RequestOptions): Promise<unknown>;
  exportCookies(): string;
  importCookies(serialized: string): void;
}

export class VRChatClient implements SessionClient {
  private jar = new CookieJar();
  private blockedUntil = 0;

  constructor(
    private readonly userAgent: string,
    private readonly fetcher: typeof fetch = fetch,
    private readonly timeoutMs = 15000,
  ) {}

  exportCookies(): string {
    return JSON.stringify(this.jar.serializeSync());
  }

  importCookies(serialized: string): void {
    try {
      this.jar = CookieJar.deserializeSync(serialized);
    } catch {
      throw new VRChatApiError('storage');
    }
  }

  async request(path: string, options: RequestOptions = {}): Promise<unknown> {
    const url = new URL(`${API_BASE}${path}`);
    if (!path.startsWith('/') || url.origin !== 'https://api.vrchat.cloud' ||
      !url.pathname.startsWith('/api/1/') || url.hash || path.includes('\\')) {
      throw new VRChatApiError('invalidInput');
    }
    const method = options.method ?? 'GET';
    const retries = method === 'GET' && !options.authorization && options.retry !== false ? 2 : 0;
    for (let attempt = 0; ; attempt++) {
      if (options.signal?.aborted) throw new VRChatApiError('cancelled');
      if (Date.now() < this.blockedUntil) {
        throw new VRChatApiError('rateLimited', this.blockedUntil - Date.now());
      }
      try {
        return await this.once(url.toString(), method, options, attempt);
      } catch (error) {
        if (!(error instanceof VRChatApiError) || attempt >= retries ||
          !['rateLimited', 'server', 'network', 'timeout'].includes(error.code)) throw error;
        const delay = error.retryAfterMs ?? 1000 * 2 ** attempt;
        // Long server cooldowns are returned to the caller instead of holding IPC open.
        if (delay > 10000) throw error;
        await waitForRetry(delay, options.signal);
      }
    }
  }

  private async once(url: string, method: string, options: RequestOptions, attempt: number): Promise<unknown> {
    const controller = new AbortController();
    const cancel = () => controller.abort();
    options.signal?.addEventListener('abort', cancel, { once: true });
    if (options.signal?.aborted) controller.abort();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers: Record<string, string> = { Accept: 'application/json', 'User-Agent': this.userAgent };
      const cookie = this.jar.getCookieStringSync(url);
      if (cookie) headers.Cookie = cookie;
      if (options.authorization) headers.Authorization = options.authorization;
      if (options.body !== undefined) headers['Content-Type'] = 'application/json';
      const response = await this.fetcher(url, {
        method, headers, redirect: 'error', signal: controller.signal,
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
      });
      if (options.signal?.aborted) throw new VRChatApiError('cancelled');
      for (const cookie of response.headers.getSetCookie()) {
        this.jar.setCookieSync(cookie, url, { ignoreError: true });
      }
      if (!response.ok) {
        // Consume no server error body: it may contain credentials or private locations.
        void response.body?.cancel().catch((): void => {});
        switch (response.status) {
          case 401: throw new VRChatApiError('unauthorized');
          case 403: throw new VRChatApiError('forbidden');
          case 404: throw new VRChatApiError('notFound');
          case 429: {
            const retryAfterMs = parseRetryAfter(response.headers.get('Retry-After')) ?? 1000 * 2 ** attempt;
            this.blockedUntil = Date.now() + retryAfterMs;
            throw new VRChatApiError('rateLimited', retryAfterMs);
          }
          default: throw new VRChatApiError(response.status >= 500 ? 'server' : 'invalidInput');
        }
      }
      try {
        return await response.json();
      } catch {
        if (controller.signal.aborted) throw new VRChatApiError(options.signal?.aborted ? 'cancelled' : 'timeout');
        throw new VRChatApiError('invalidResponse');
      }
    } catch (error) {
      if (error instanceof VRChatApiError) throw error;
      throw new VRChatApiError(controller.signal.aborted ? (options.signal?.aborted ? 'cancelled' : 'timeout') : 'network');
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', cancel);
    }
  }
}

function parseRetryAfter(value: string | null): number | undefined {
  if (value === null) return undefined;
  if (/^\d+$/.test(value)) return Math.max(1000, Number(value) * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(1000, date - Date.now()) : undefined;
}

function waitForRetry(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const cancel = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      reject(new VRChatApiError('cancelled'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', cancel);
      resolve();
    }, ms);
    signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) cancel();
  });
}
