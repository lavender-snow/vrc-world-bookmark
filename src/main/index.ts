import { app, BrowserWindow, shell, Menu, MenuItem, MenuItemConstructorOptions } from 'electron';

import electronSquirrelStartup from 'electron-squirrel-startup';

import './vrchat-api';
import { registerIpcHandler } from './bookmark-ipc';
import { initDB, runMigrations } from './database';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (electronSquirrelStartup) {
  app.quit();
}

function setupContextMenu(mainWindow: BrowserWindow): void {
  mainWindow.webContents.on('context-menu', (_event, params) => {
    const isEditable = params.isEditable;

    const template: (MenuItem | MenuItemConstructorOptions)[] = isEditable
      ? [
        { label: '元に戻す', role: 'undo' },
        { label: 'やり直す', role: 'redo' },
        { type: 'separator' },
        { label: 'カット', role: 'cut' },
        { label: 'コピー', role: 'copy' },
        { label: '貼り付け', role: 'paste' },
        { label: '全選択', role: 'selectAll' },
      ] : [
        {
          label: 'リロード',
          click: () => {
            mainWindow.webContents.reload();
          },
        },
        { type: 'separator' },
        { label: 'コピー', role: 'copy' },
      ];

    const menu = Menu.buildFromTemplate(template);
    menu.popup({ window: mainWindow });
  });
}

function setupWindowOpenHandler(mainWindow: BrowserWindow): void {
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {{
    shell.openExternal(url);
    return { action: 'deny' };
  }});
}

function setupContentSecurityPolicy(mainWindow: BrowserWindow): void {
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self';",
          "script-src 'self';",
          "style-src 'self' 'unsafe-inline';",
          "img-src 'self' data: https://*.vrchat.cloud;",
          "connect-src 'self';",
          "font-src 'self';",
          "object-src 'none';",
          "frame-src 'none';",
        ].join(' '),
      },
    });
  });
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    height: 930,
    width: 900,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
    autoHideMenuBar: true,
    title: 'VRChat World Bookmark',
  });

  setupContextMenu(mainWindow);
  setupContentSecurityPolicy(mainWindow);
  setupWindowOpenHandler(mainWindow);

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
};

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  initDB();
  runMigrations();
  registerIpcHandler();
  createWindow();
});
