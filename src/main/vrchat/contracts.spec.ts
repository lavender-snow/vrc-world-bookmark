import {
  buildCreateInstanceRequest,
  buildSelfInvitePath,
  parseAuthResponse,
  parseInstanceReference,
  parseInviteResponse,
  parseTwoFactorVerification,
  twoFactorVerifyPath,
  VRChatContractError,
} from './contracts';
import type { CreateInstanceOptions, InstanceAccess, TwoFactorMethod } from './contracts';

const userId = 'usr_00000000-0000-0000-0000-000000000001';
const otherUserId = 'usr_00000000-0000-0000-0000-000000000002';
const worldId = 'wrld_00000000-0000-0000-0000-000000000001';
const instanceId = `12345~private(${userId})~region(jp)~nonce(test-only)`;
const instance = { worldId, instanceId, location: `${worldId}:${instanceId}` };

describe('VRChat authentication contracts', () => {
  it('projects only public account fields, excluding secrets and unrelated data', () => {
    expect(parseAuthResponse({ id: userId, displayName: 'テスト', authToken: 'secret', email: 'private' }))
      .toEqual({ kind: 'authenticated', user: { id: userId, displayName: 'テスト' } });
  });

  it('keeps unknown challenges and never treats a challenge as a completed login', () => {
    expect(parseAuthResponse({ id: userId, displayName: 'Test', requiresTwoFactorAuth: ['totp', 'otp', 'totp'] }))
      .toEqual({ kind: 'twoFactorRequired', methods: ['totp', 'otp'] });
  });

  it.each([null, [], {}, { requiresTwoFactorAuth: [] }, { requiresTwoFactorAuth: 'totp' },
    { requiresTwoFactorAuth: [null] }, { id: 'offline', displayName: 'Test' }])('rejects malformed authentication: %j', value => {
    expect(() => parseAuthResponse(value)).toThrow(VRChatContractError);
  });

  it('routes the mixed-case emailOtp challenge to the lower-case API path', () => {
    expect(twoFactorVerifyPath('emailOtp')).toBe('/auth/twofactorauth/emailotp/verify');
    expect(twoFactorVerifyPath('totp')).toBe('/auth/twofactorauth/totp/verify');
    expect(() => twoFactorVerifyPath('otp' as TwoFactorMethod)).toThrow(VRChatContractError);
  });

  it('requires an explicit boolean verification result', () => {
    expect(parseTwoFactorVerification({ verified: true, enabled: true })).toBe(true);
    expect(parseTwoFactorVerification({ verified: false })).toBe(false);
    expect(() => parseTwoFactorVerification({ verified: 'true' })).toThrow(VRChatContractError);
    expect(() => parseTwoFactorVerification({ enabled: true })).toThrow(VRChatContractError);
  });
});

describe('VRChat instance contracts', () => {
  it.each([
    ['public', { type: 'public', ownerId: null }],
    ['friendsPlus', { type: 'hidden', ownerId: userId }],
    ['friends', { type: 'friends', ownerId: userId }],
    ['invitePlus', { type: 'private', ownerId: userId, canRequestInvite: true }],
    ['invite', { type: 'private', ownerId: userId, canRequestInvite: false }],
  ])('maps %s access without adding unsupported request fields', (access, expected) => {
    expect(buildCreateInstanceRequest({ worldId, access: access as InstanceAccess, region: 'jp' }, userId))
      .toEqual({ worldId, region: 'jp', ...expected });
  });

  it.each([{ region: 'unknown' }, { access: 'group' }, { worldId: '../auth/user' }])('rejects unsupported input: %j', extra => {
    const options = { worldId, access: 'invite', region: 'jp', ...extra } as CreateInstanceOptions;
    expect(() => buildCreateInstanceRequest(options, userId)).toThrow(VRChatContractError);
  });

  it('uses the authenticated owner instead of an extra owner supplied by the caller', () => {
    const options = { worldId, access: 'friends' as const, region: 'jp' as const, ownerId: otherUserId };
    expect(buildCreateInstanceRequest(options, userId).ownerId).toBe(userId);
  });

  it('preserves the returned instance identifier and nonce exactly', () => {
    expect(parseInstanceReference({ ...instance, unrelated: 'value' }, worldId)).toEqual(instance);
  });

  it.each(['offline', 'private', 'traveling', '', '   ', `${worldId}:12345`])('rejects non-instance identifiers: %s', invalidId => {
    expect(() => parseInstanceReference({ ...instance, instanceId: invalidId }, worldId)).toThrow(VRChatContractError);
  });

  it('rejects a mismatched world or location', () => {
    expect(() => parseInstanceReference(instance, 'wrld_00000000-0000-0000-0000-000000000002')).toThrow(VRChatContractError);
    expect(() => parseInstanceReference({ ...instance, location: `${worldId}:different` }, worldId)).toThrow(VRChatContractError);
  });

  it('encodes path delimiters in opaque instance IDs', () => {
    const opaqueId = 'future/id?key=value#fragment';
    expect(buildSelfInvitePath({ worldId, instanceId: opaqueId, location: `${worldId}:${opaqueId}` }))
      .toBe(`/invite/myself/to/${worldId}:future%2Fid%3Fkey%3Dvalue%23fragment`);
  });

  it('does not expose private response values in validation errors', () => {
    try {
      parseInstanceReference({ ...instance, location: 'secret-nonce' }, worldId);
      throw new Error('Expected a contract error');
    } catch (error) {
      expect(error).toBeInstanceOf(VRChatContractError);
      expect((error as Error).message).not.toContain('secret-nonce');
    }
  });
});

describe('VRChat invite contracts', () => {
  const notification = { id: 'notification-id', type: 'invite', receiverUserId: userId };

  it('accepts an invite for the intended recipient without guessing an ID prefix', () => {
    expect(parseInviteResponse(notification, userId)).toEqual({ id: 'notification-id', type: 'invite' });
  });

  it('rejects the inconsistent friendRequest example and a different recipient', () => {
    expect(() => parseInviteResponse({ ...notification, type: 'friendRequest' }, userId)).toThrow(VRChatContractError);
    expect(() => parseInviteResponse(notification, otherUserId)).toThrow(VRChatContractError);
  });
});
