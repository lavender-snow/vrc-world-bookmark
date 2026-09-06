/** @jest-environment node */
import { safeStorage } from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { EncryptedSessionStore } from './session-store';

jest.mock('electron', () => ({ safeStorage: {
  isEncryptionAvailable: jest.fn(() => true),
  getSelectedStorageBackend: jest.fn(() => 'gnome_libsecret'),
  encryptString: jest.fn(() => Buffer.from('encrypted-by-os')),
  decryptString: jest.fn(() => 'cookie-jar'),
} }));

describe('encrypted VRChat session storage', () => {
  let directory: string;
  let file: string;
  let store: EncryptedSessionStore;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(true);
    jest.mocked(safeStorage.decryptString).mockReturnValue('cookie-jar');
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vrc-session-test-'));
    file = path.join(directory, 'nested', 'session.dat');
    store = new EncryptedSessionStore(file);
  });
  afterEach(() => {
    // Only remove the exact temporary directory created by this test.
    if (path.dirname(path.resolve(directory)) !== path.resolve(os.tmpdir()) || !path.basename(directory).startsWith('vrc-session-test-')) {
      throw new Error('Unexpected temporary directory');
    }
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('creates the directory, writes only encrypted bytes and decrypts for main', () => {
    expect(store.load()).toBeNull();
    expect(store.save('cookie-jar')).toBe(true);
    expect(fs.readFileSync(file).toString()).toBe('encrypted-by-os');
    expect(fs.existsSync(`${file}.tmp`)).toBe(false);
    expect(store.load()).toBe('cookie-jar');
  });

  it('never writes plaintext when encryption is unavailable', () => {
    jest.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false);
    expect(store.save('secret')).toBe(false);
    expect(fs.existsSync(file)).toBe(false);
    expect(safeStorage.encryptString).not.toHaveBeenCalled();
  });

  it('does not overwrite corrupt data on read and sanitizes the error', () => {
    store.save('cookie-jar');
    jest.mocked(safeStorage.decryptString).mockImplementation(() => { throw new Error('private path and secret'); });
    expect(() => store.load()).toThrow('VRChat operation failed: storage');
    expect(fs.readFileSync(file).toString()).toBe('encrypted-by-os');
  });

  it('deletes only session files and does not require decryption to log out', () => {
    store.save('cookie-jar');
    const llmFile = path.join(path.dirname(file), 'secrets.dat');
    fs.writeFileSync(llmFile, 'existing-llm-keys');
    jest.mocked(safeStorage.isEncryptionAvailable).mockReturnValue(false);
    store.clear();
    store.clear();
    expect(fs.existsSync(file)).toBe(false);
    expect(fs.readFileSync(llmFile).toString()).toBe('existing-llm-keys');
  });
});
