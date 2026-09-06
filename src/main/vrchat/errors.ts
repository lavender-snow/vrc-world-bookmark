import { VRChatContractError } from './contracts';

import type { AuthError, AuthErrorCode } from 'src/types/vrchat-auth';

export class VRChatApiError extends Error {
  constructor(public readonly code: AuthErrorCode, public readonly retryAfterMs?: number) {
    super(`VRChat operation failed: ${code}`);
    this.name = 'VRChatApiError';
  }
}

export function publicAuthError(error: unknown): AuthError {
  if (error instanceof VRChatApiError) {
    return { code: error.code, ...(error.retryAfterMs === undefined ? {} : { retryAfterMs: error.retryAfterMs }) };
  }
  return { code: error instanceof VRChatContractError ? 'invalidResponse' : 'unexpected' };
}
