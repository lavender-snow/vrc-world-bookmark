import { ipcMain } from 'electron';
import type { BrowserWindow, IpcMainInvokeEvent } from 'electron';

import type { VRChatFriendsService } from './friends-service';
import type { VRChatInstanceService } from './instance-service';
import { isTrustedAuthSender } from './ipc';

import type { FriendPageInput, InviteInput } from 'src/types/vrchat-invite';

export function registerInviteIpc(instances: VRChatInstanceService, friends: VRChatFriendsService, getWindow: () => BrowserWindow | undefined, entryUrl: string) {
  function guard(event: IpcMainInvokeEvent) {
    const window = getWindow();
    if (!window || !isTrustedAuthSender(event, window, entryUrl)) throw new Error('Unauthorized IPC sender');
  }
  ipcMain.handle('vrchat_friends_list', (event, input: FriendPageInput) => { guard(event); return friends.list(input); });
  ipcMain.handle('vrchat_invite_send', (event, input: InviteInput) => { guard(event); return instances.invite(input); });
}
