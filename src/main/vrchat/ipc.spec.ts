/** @jest-environment node */
import { ipcMain } from 'electron';
import type { BrowserWindow, IpcMainInvokeEvent } from 'electron';

import type { VRChatAuthService } from './auth-service';
import { isTrustedAuthSender, registerAuthIpc } from './ipc';

jest.mock('electron', () => ({ ipcMain: { handle: jest.fn() } }));

describe('VRChat authentication IPC boundary', () => {
  const entry = 'file:///app/index.html';
  function sender(url = entry) {
    const frame = { url };
    const webContents = { mainFrame: frame };
    const window = { isDestroyed: () => false, webContents } as unknown as BrowserWindow;
    const event = { sender: webContents, senderFrame: frame } as unknown as IpcMainInvokeEvent;
    return { window, event };
  }

  it('accepts the application main frame and optional hash', () => {
    const { window, event } = sender(`${entry}#settings`);
    expect(isTrustedAuthSender(event, window, entry)).toBe(true);
  });

  it('rejects other windows, subframes and navigation to another page', () => {
    const { window, event } = sender();
    expect(isTrustedAuthSender({ ...event, sender: {} } as IpcMainInvokeEvent, window, entry)).toBe(false);
    expect(isTrustedAuthSender({ ...event, senderFrame: { url: entry } } as IpcMainInvokeEvent, window, entry)).toBe(false);
    const external = sender('https://example.com/');
    expect(isTrustedAuthSender(external.event, external.window, entry)).toBe(false);
  });

  it('applies the guard to every handler before invoking the auth service', () => {
    jest.mocked(ipcMain.handle).mockClear();
    const auth = { getState: jest.fn(), restoreSession: jest.fn(), login: jest.fn(), verifyTwoFactor: jest.fn(), logout: jest.fn() };
    const { window, event } = sender();
    registerAuthIpc(auth as unknown as VRChatAuthService, () => window, entry);
    expect(ipcMain.handle).toHaveBeenCalledTimes(5);
    for (const [, handler] of jest.mocked(ipcMain.handle).mock.calls) {
      expect(() => handler({ ...event, sender: {} } as IpcMainInvokeEvent)).toThrow('Unauthorized IPC sender');
    }
    expect(Object.values(auth).every(method => method.mock.calls.length === 0)).toBe(true);
  });
});
