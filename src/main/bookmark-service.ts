import { ipcMain } from "electron";
import { initDB, runMigrations, addOrUpdateWorldInfo, deleteWorldInfo, getGenres, updateWorldBookmark, getWorldInfo, getVisitStatuses, getBookmarkList } from "./database";
import { fetchWorldInfo, WorldNotFoundError } from "./vrchat-api";
import type { BookmarkListOptions, UpdateWorldBookmarkOptions } from "../types/renderer";

export async function upsertWorldBookmark(worldId: string) {
  try {
    const world = await fetchWorldInfo(worldId);

    addOrUpdateWorldInfo(world);
  } catch (error) {
    if (error instanceof WorldNotFoundError) {
      deleteWorldInfo(worldId);
    } else {
      console.error(`Error fetching world info for ${worldId}:`, error);
    }
  }

  return getWorldInfo(worldId);
}

export function initializeApp() {
  initDB();
  runMigrations();

  ipcMain.handle("get_genres", async () => {
    const genres = getGenres();

    return genres;
  });

  ipcMain.handle("get_visit_statuses", async () => {
    const visitStatuses = getVisitStatuses();
    
    return visitStatuses;
  });

  ipcMain.handle("add_or_update_world_info", async (event, worldId: string) => {
    return upsertWorldBookmark(worldId);
  });

  ipcMain.handle("get_world_info", async (event, worldId: string) => {
    return getWorldInfo(worldId);
  });

  ipcMain.handle("update_world_bookmark", async (event, options: UpdateWorldBookmarkOptions) => {
    updateWorldBookmark(options);
  });

  ipcMain.handle("get_bookmark_list", async (event, options: BookmarkListOptions) => {
    return getBookmarkList(options);
  });
}

