import { ipcMain } from 'electron';
import type { BrowserWindow, IpcMainInvokeEvent } from 'electron';

import type { VRChatInstanceService } from './instance-service';
import { isTrustedAuthSender } from './ipc';

import type { CloseInstanceInput, CreateInstanceOptions } from 'src/types/vrchat-instance';

export function registerInstanceIpc(service: VRChatInstanceService, getWindow: () => BrowserWindow | undefined, entryUrl: string): void {
  function guard(event: IpcMainInvokeEvent) {
    const window = getWindow();
    if (!window || !isTrustedAuthSender(event, window, entryUrl)) throw new Error('Unauthorized IPC sender');
  }
  ipcMain.handle('vrchat_instance_state', (event, worldId: string) => { guard(event); return service.getState(worldId); });
  ipcMain.handle('vrchat_instance_create', (event, options: CreateInstanceOptions) => { guard(event); return service.create(options); });
  ipcMain.handle('vrchat_instance_reset', (event, worldId: string) => { guard(event); return service.reset(worldId); });
  ipcMain.handle('vrchat_instance_list', event => { guard(event); return service.list(); });
  ipcMain.handle('vrchat_instance_close', (event, input: CloseInstanceInput) => { guard(event); return service.close(input); });
}
