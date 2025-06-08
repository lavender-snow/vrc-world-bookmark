import { ipcMain } from 'electron';

import type { BookmarkListOptions, UpdateWorldBookmarkOptions, UpdateWorldGenresOptions } from '../types/renderer';

import { initDB, runMigrations, addOrUpdateWorldInfo, deleteWorldInfo, getGenres, updateWorldBookmark, getWorldInfo, getVisitStatuses, getBookmarkList, updateWorldGenres } from './database';
import { fetchWorldInfo, VRChatServerError, WorldNotFoundError } from './vrchat-api';

export async function upsertWorldBookmark(worldId: string) {
  try {
    const world = await fetchWorldInfo(worldId);

    addOrUpdateWorldInfo(world);
  } catch (error) {
    if (error instanceof WorldNotFoundError) {
      deleteWorldInfo(worldId);
    } else if (error instanceof VRChatServerError) {
      console.error('VRChat server error:', error);
      return {
        error: `VRChat server error: ${error.message}`,
      };
    } else {
      console.error(`Error fetching world info for ${worldId}:`, error);
      return {
        error: `Error fetching world info: ${error.message}`,
      };
    }
  }

  return { data: getWorldInfo(worldId) };
}

export function initializeApp() {
  initDB();
  runMigrations();

  ipcMain.handle('get_genres', async () => {
    const genres = getGenres();

    return genres;
  });

  ipcMain.handle('get_visit_statuses', async () => {
    const visitStatuses = getVisitStatuses();

    return visitStatuses;
  });

  ipcMain.handle('add_or_update_world_info', async (event, worldId: string) => {
    return upsertWorldBookmark(worldId);
  });

  ipcMain.handle('get_world_info', async (event, worldId: string) => {
    return getWorldInfo(worldId);
  });

  ipcMain.handle('update_world_bookmark', async (event, options: UpdateWorldBookmarkOptions) => {
    updateWorldBookmark(options);
  });

  ipcMain.handle('update_world_genres', async (event, options: UpdateWorldGenresOptions) => {
    updateWorldGenres(options);
  });

  ipcMain.handle('get_bookmark_list', async (event, options: BookmarkListOptions) => {
    return getBookmarkList(options);
  });
}
