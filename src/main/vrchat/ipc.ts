import { ipcMain } from 'electron';
import type { BrowserWindow, IpcMainInvokeEvent } from 'electron';

import type { VRChatAuthService } from './auth-service';

import type { LoginInput, TwoFactorInput } from 'src/types/vrchat-auth';

export function isTrustedAuthSender(event: IpcMainInvokeEvent, window: BrowserWindow, entryUrl: string): boolean {
  if (window.isDestroyed() || event.sender !== window.webContents ||
    !event.senderFrame || event.senderFrame !== window.webContents.mainFrame) return false;
  try {
    const actual = new URL(event.senderFrame.url);
    const expected = new URL(entryUrl);
    actual.hash = '';
    expected.hash = '';
    return actual.href === expected.href;
  } catch {
    return false;
  }
}

export function registerAuthIpc(auth: VRChatAuthService, getWindow: () => BrowserWindow | undefined, entryUrl: string): void {
  const guard = (event: IpcMainInvokeEvent) => {
    const window = getWindow();
    if (!window || !isTrustedAuthSender(event, window, entryUrl)) throw new Error('Unauthorized IPC sender');
  };
  ipcMain.handle('vrchat_auth_state', event => { guard(event); return auth.getState(); });
  ipcMain.handle('vrchat_auth_restore', event => { guard(event); return auth.restoreSession(); });
  ipcMain.handle('vrchat_auth_login', (event, input: LoginInput) => { guard(event); return auth.login(input); });
  ipcMain.handle('vrchat_auth_verify', (event, input: TwoFactorInput) => { guard(event); return auth.verifyTwoFactor(input); });
  ipcMain.handle('vrchat_auth_logout', event => { guard(event); return auth.logout(); });
}
