/** @jest-environment node */
import { ipcMain } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';

import { registerInstanceIpc } from './instance-ipc';
import type { VRChatInstanceService } from './instance-service';

jest.mock('electron', () => ({ ipcMain: { handle: jest.fn() } }));

it('rejects every instance operation when there is no trusted window', () => {
  const service = { create: jest.fn(), reset: jest.fn(), getState: jest.fn() };
  registerInstanceIpc(service as unknown as VRChatInstanceService, () => undefined, 'file:///app/index.html');
  expect(ipcMain.handle).toHaveBeenCalledTimes(3);
  for (const [, handler] of jest.mocked(ipcMain.handle).mock.calls) {
    expect(() => handler({} as IpcMainInvokeEvent)).toThrow('Unauthorized IPC sender');
  }
  expect(service.create).not.toHaveBeenCalled();
  expect(service.reset).not.toHaveBeenCalled();
  expect(service.getState).not.toHaveBeenCalled();
});
