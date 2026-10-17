/** @jest-environment node */
import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';

import { registerGroupsIpc } from './groups-ipc';
import type { VRChatGroupsService } from './groups-service';
import type { VRChatInstanceService } from './instance-service';

jest.mock('electron', () => ({ ipcMain: { handle: jest.fn() } }));

it('guards every group read, mutation and batch operation against untrusted senders', () => {
  const groups = { list: jest.fn(), save: jest.fn(), remove: jest.fn() };
  const instances = { inviteGroup: jest.fn(), cancelGroup: jest.fn() };
  registerGroupsIpc(groups as unknown as VRChatGroupsService, instances as unknown as VRChatInstanceService, () => undefined, 'file:///app/index.html');
  expect(ipcMain.handle).toHaveBeenCalledTimes(5);
  for (const [, handler] of jest.mocked(ipcMain.handle).mock.calls) expect(() => handler({} as IpcMainInvokeEvent)).toThrow('Unauthorized IPC sender');
  for (const fn of [...Object.values(groups), ...Object.values(instances)]) expect(fn).not.toHaveBeenCalled();
});
