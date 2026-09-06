export type AuthErrorCode = 'invalidInput' | 'busy' | 'cancelled' | 'unauthorized' | 'forbidden' |
  'notFound' | 'rateLimited' | 'server' | 'network' | 'timeout' | 'invalidResponse' | 'storage' | 'unexpected';

export interface AuthError {
  code: AuthErrorCode;
  retryAfterMs?: number;
}

export type AuthState = {
  persistence: 'saved' | 'memory' | 'none';
  error?: AuthError;
} & (
  | { status: 'signedOut' | 'restoring' | 'restoreFailed' | 'loggingIn' | 'expired' }
  | { status: 'twoFactorRequired'; methods: string[] }
  | { status: 'authenticated'; user: { id: string; displayName: string } }
);

export interface LoginInput { username: string; password: string }
export interface TwoFactorInput { method: 'totp' | 'emailOtp'; code: string }
export type AuthResult = { ok: true; state: AuthState } | { ok: false; state: AuthState; error: AuthError };

export interface VRChatAuthAPI {
  getAuthState: () => Promise<AuthState>;
  restoreSession: () => Promise<AuthResult>;
  login: (input: LoginInput) => Promise<AuthResult>;
  verifyTwoFactor: (input: TwoFactorInput) => Promise<AuthResult>;
  logout: () => Promise<AuthResult>;
}
