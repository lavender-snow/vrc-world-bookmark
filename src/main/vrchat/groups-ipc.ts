import { ipcMain } from 'electron';
import type { BrowserWindow, IpcMainInvokeEvent } from 'electron';

import type { VRChatGroupsService } from './groups-service';
import type { VRChatInstanceService } from './instance-service';
import { isTrustedAuthSender } from './ipc';

import type { DeleteGroupInput, GroupInviteInput, SaveGroupInput } from 'src/types/vrchat-groups';

export function registerGroupsIpc(groups: VRChatGroupsService, instances: VRChatInstanceService, getWindow: () => BrowserWindow | undefined, entryUrl: string): void {
  function guard(event: IpcMainInvokeEvent) {
    const window = getWindow();
    if (!window || !isTrustedAuthSender(event, window, entryUrl)) throw new Error('Unauthorized IPC sender');
  }
  ipcMain.handle('vrchat_groups_list', event => { guard(event); return groups.list(); });
  ipcMain.handle('vrchat_groups_save', (event, input: SaveGroupInput) => { guard(event); return groups.save(input); });
  ipcMain.handle('vrchat_groups_remove', (event, input: DeleteGroupInput) => { guard(event); return groups.remove(input); });
  ipcMain.handle('vrchat_groups_send', (event, input: GroupInviteInput) => { guard(event); return instances.inviteGroup(input); });
  ipcMain.handle('vrchat_groups_cancel', (event, instanceKey: string) => { guard(event); return instances.cancelGroup(instanceKey); });
}
