import { safeStorage } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

import { VRChatApiError } from './errors';

export interface SessionStore {
  load(): string | null;
  save(value: string): boolean;
  clear(): void;
}

/** Separate file; never reachable through the generic credential IPC. */
export class EncryptedSessionStore implements SessionStore {
  constructor(private readonly filePath: string) {}

  private canEncrypt(): boolean {
    return safeStorage.isEncryptionAvailable() &&
      (process.platform !== 'linux' || safeStorage.getSelectedStorageBackend() !== 'basic_text');
  }

  load(): string | null {
    try {
      if (!fs.existsSync(this.filePath)) return null;
      if (!this.canEncrypt()) throw new VRChatApiError('storage');
      return safeStorage.decryptString(fs.readFileSync(this.filePath));
    } catch {
      throw new VRChatApiError('storage');
    }
  }

  save(value: string): boolean {
    const temporaryPath = `${this.filePath}.tmp`;
    try {
      if (!this.canEncrypt()) return false;
      const encrypted = safeStorage.encryptString(value);
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(temporaryPath, encrypted, { mode: 0o600 });
      fs.renameSync(temporaryPath, this.filePath);
      return true;
    } catch {
      throw new VRChatApiError('storage');
    } finally {
      try { fs.rmSync(temporaryPath, { force: true }); } catch { /* Never expose filesystem errors. */ }
    }
  }

  clear(): void {
    try {
      fs.rmSync(this.filePath, { force: true });
      fs.rmSync(`${this.filePath}.tmp`, { force: true });
    } catch {
      throw new VRChatApiError('storage');
    }
  }
}
