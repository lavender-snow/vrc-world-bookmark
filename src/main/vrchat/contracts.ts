import type { CreateInstanceOptions, InstanceRegion } from 'src/types/vrchat-instance';

export type { CreateInstanceOptions, InstanceAccess, InstanceRegion } from 'src/types/vrchat-instance';

/** API boundary validation. Never include response bodies or credentials in errors. */
export class VRChatContractError extends Error {
  constructor(field: string) {
    super(`Invalid VRChat API field: ${field}`);
    this.name = 'VRChatContractError';
  }
}

export type TwoFactorMethod = 'totp' | 'emailOtp';

export interface AuthUser {
  id: string;
  displayName: string;
}

export type AuthResponse =
  | { kind: 'authenticated'; user: AuthUser }
  | { kind: 'twoFactorRequired'; methods: string[] };

export interface CreateInstanceRequest {
  worldId: string;
  type: 'public' | 'hidden' | 'friends' | 'private';
  region: InstanceRegion;
  ownerId: string | null;
  canRequestInvite?: boolean;
}

/** Main-only: location can contain a private instance nonce. */
export interface InstanceReference {
  worldId: string;
  instanceId: string;
  location: string;
}

function record(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new VRChatContractError(field);
  }
  return value as Record<string, unknown>;
}

function nonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new VRChatContractError(field);
  }
  return value;
}

function entityId(value: unknown, prefix: 'usr' | 'wrld', field: string): string {
  const id = nonEmptyString(value, field);
  const pattern = new RegExp(`^${prefix}_[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`, 'i');
  if (!pattern.test(id)) throw new VRChatContractError(field);
  return id;
}

export function parseAuthResponse(value: unknown): AuthResponse {
  const data = record(value, 'auth');
  if ('requiresTwoFactorAuth' in data) {
    const methods = data.requiresTwoFactorAuth;
    if (!Array.isArray(methods) || methods.length === 0) {
      throw new VRChatContractError('requiresTwoFactorAuth');
    }
    // Preserve unknown methods so callers can display an unsupported challenge.
    return {
      kind: 'twoFactorRequired',
      methods: [...new Set(methods.map(method => nonEmptyString(method, 'requiresTwoFactorAuth')))],
    };
  }
  return {
    kind: 'authenticated',
    user: {
      id: entityId(data.id, 'usr', 'id'),
      displayName: nonEmptyString(data.displayName, 'displayName'),
    },
  };
}

export function twoFactorVerifyPath(method: TwoFactorMethod): string {
  switch (method) {
    case 'totp': return '/auth/twofactorauth/totp/verify';
    case 'emailOtp': return '/auth/twofactorauth/emailotp/verify';
    default: throw new VRChatContractError('twoFactorMethod');
  }
}

export function parseTwoFactorVerification(value: unknown): boolean {
  const data = record(value, 'twoFactorVerification');
  if (typeof data.verified !== 'boolean') throw new VRChatContractError('verified');
  return data.verified;
}

export function buildCreateInstanceRequest(options: CreateInstanceOptions, currentUserId: string): CreateInstanceRequest {
  const data = record(options, 'createInstance');
  const worldId = entityId(data.worldId, 'wrld', 'worldId');
  const ownerId = entityId(currentUserId, 'usr', 'ownerId');
  if (!['jp', 'us', 'use', 'eu'].includes(data.region as string)) {
    throw new VRChatContractError('region');
  }
  const common = { worldId, region: data.region as InstanceRegion, ownerId };
  switch (data.access) {
    case 'public': return { ...common, type: 'public', ownerId: null };
    case 'friendsPlus': return { ...common, type: 'hidden' };
    case 'friends': return { ...common, type: 'friends' };
    case 'invitePlus': return { ...common, type: 'private', canRequestInvite: true };
    case 'invite': return { ...common, type: 'private', canRequestInvite: false };
    default: throw new VRChatContractError('access');
  }
}

export function parseInstanceReference(value: unknown, expectedWorldId: string): InstanceReference {
  const data = record(value, 'instance');
  const worldId = entityId(data.worldId, 'wrld', 'worldId');
  if (worldId !== entityId(expectedWorldId, 'wrld', 'expectedWorldId')) {
    throw new VRChatContractError('worldId');
  }
  const instanceId = nonEmptyString(data.instanceId, 'instanceId');
  // Treat IDs as opaque; do not reconstruct access tags or nonce values.
  if (['offline', 'private', 'traveling'].includes(instanceId) || /[:\s]/.test(instanceId)) {
    throw new VRChatContractError('instanceId');
  }
  const location = nonEmptyString(data.location, 'location');
  if (location !== `${worldId}:${instanceId}`) throw new VRChatContractError('location');
  return { worldId, instanceId, location };
}

export function buildSelfInvitePath(instance: InstanceReference): string {
  const validated = parseInstanceReference(instance, instance?.worldId);
  return `/invite/myself/to/${encodeURIComponent(validated.worldId)}:${encodeURIComponent(validated.instanceId)}`;
}

/** Successful HTTP status alone does not establish a valid invite notification. */
export function parseInviteResponse(value: unknown, expectedReceiverUserId: string): { id: string; type: 'invite' } {
  const data = record(value, 'invite');
  if (data.type !== 'invite') throw new VRChatContractError('type');
  const id = nonEmptyString(data.id, 'id');
  const receiver = entityId(data.receiverUserId, 'usr', 'receiverUserId');
  if (receiver !== entityId(expectedReceiverUserId, 'usr', 'expectedReceiverUserId')) {
    throw new VRChatContractError('receiverUserId');
  }
  return { id, type: 'invite' };
}
