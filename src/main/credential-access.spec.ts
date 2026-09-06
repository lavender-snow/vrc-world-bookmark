import { assertRendererCredentialKey } from './credential-access';

import { CREDENTIAL_KEYS } from 'src/consts/credential-keys';

it('allows existing LLM settings keys', () => {
  for (const key of Object.values(CREDENTIAL_KEYS)) expect(() => assertRendererCredentialKey(key)).not.toThrow();
});

it.each(['bookmarkListInitMode', 'currentLLM', 'bedrockCredentials', 'openaiApiKey'])('preserves existing settings key %s', key => {
  expect(() => assertRendererCredentialKey(key)).not.toThrow();
});

it.each(['vrchatSession', 'auth', 'twoFactorAuth', '__proto__', '../vrchat-session.dat', null])('rejects arbitrary credential key %s', key => {
  expect(() => assertRendererCredentialKey(key)).toThrow('Unsupported credential key');
});
