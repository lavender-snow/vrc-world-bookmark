/** @jest-environment node */
import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';

import type { VRChatFriendsService } from './friends-service';
import type { VRChatInstanceService } from './instance-service';
import { registerInviteIpc } from './invite-ipc';

jest.mock('electron', () => ({ ipcMain: { handle: jest.fn() } }));

it('rejects friend reads and invite sends without a trusted window', () => {
  const instances = { invite: jest.fn() };
  const friends = { list: jest.fn() };
  registerInviteIpc(instances as unknown as VRChatInstanceService, friends as unknown as VRChatFriendsService, () => undefined, 'file:///app/index.html');
  expect(ipcMain.handle).toHaveBeenCalledTimes(2);
  for (const [, handler] of jest.mocked(ipcMain.handle).mock.calls) {
    expect(() => handler({} as IpcMainInvokeEvent)).toThrow('Unauthorized IPC sender');
  }
  expect(instances.invite).not.toHaveBeenCalled();
  expect(friends.list).not.toHaveBeenCalled();
});
