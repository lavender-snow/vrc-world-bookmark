import type { AuthError } from './vrchat-auth';

export type CurrentWorldResult =
  | { ok: true; worldId: string }
  | { ok: false; error: AuthError | { code: 'notInWorld' } };
