import { ipcMain } from 'electron';

import { searchBookmarkList, searchLLMRecommendWorld, searchRandomRecommendedWorld, upsertWorldBookmark } from './bookmark-service';
import { loadKey, saveKey } from './credential-store';
import { getGenres, getVisitStatuses, getWorldIdsToUpdate, getWorldInfo, updateWorldBookmark, updateWorldGenres } from './database';

import { BookmarkListOptions, UpdateWorldBookmarkOptions, UpdateWorldGenresOptions } from 'src/types/renderer';

function registerIpcHandlersForDatabase() {
  ipcMain.handle('get_genres', async () => {
    return getGenres();
  });

  ipcMain.handle('get_visit_statuses', async () => {
    return getVisitStatuses();
  });

  ipcMain.handle('add_or_update_world_info', async (_event, worldId: string) => {
    return upsertWorldBookmark(worldId);
  });

  ipcMain.handle('get_world_info', async (_event, worldId: string) => {
    return getWorldInfo(worldId);
  });

  ipcMain.handle('update_world_bookmark', async (_event, options: UpdateWorldBookmarkOptions) => {
    updateWorldBookmark(options);
  });

  ipcMain.handle('update_world_genres', async (_event, options: UpdateWorldGenresOptions) => {
    updateWorldGenres(options);
  });

  ipcMain.handle('get_bookmark_list', async (_event, options: BookmarkListOptions) => {
    return searchBookmarkList(options);
  });

  ipcMain.handle('get_world_ids_to_update', async () => {
    return getWorldIdsToUpdate();
  });

  ipcMain.handle('get_random_recommended_world', async () => {
    return searchRandomRecommendedWorld();
  });

  ipcMain.handle('get_llm_recommend_world', async (_event, requestMessage: string) => {
    return await searchLLMRecommendWorld(requestMessage);
  });
}

function registerIpcHandlersForCredentialStore() {
  ipcMain.handle('save_key', (_event, key: string, value: string) => {
    saveKey(key, value);
  });

  ipcMain.handle('load_key', (_event, key: string) => {
    return loadKey(key);
  });

  ipcMain.handle('is_key_saved', (_event, key: string) => {
    const value = loadKey(key);
    return !!value; // キーが存在する場合trueを返す
  });
}

export function registerIpcHandler() {
  registerIpcHandlersForDatabase();
  registerIpcHandlersForCredentialStore();
}
