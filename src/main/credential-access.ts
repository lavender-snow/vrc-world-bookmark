import { CREDENTIAL_KEYS } from 'src/consts/credential-keys';

// Some existing settings predate CREDENTIAL_KEYS and still use these stored names.
const rendererKeys = new Set<string>([
  ...Object.values(CREDENTIAL_KEYS),
  'bookmarkListInitMode',
  'currentLLM',
  'bedrockCredentials',
]);

export function assertRendererCredentialKey(key: unknown): asserts key is string {
  if (typeof key !== 'string' || !rendererKeys.has(key)) {
    throw new Error('Unsupported credential key');
  }
}
