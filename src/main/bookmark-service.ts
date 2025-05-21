import { ipcMain } from "electron";
import { initDB, runMigrations, addOrUpdateWorldInfo, deleteWorldInfo, getGenres, updateWorldBookmark, getWorldInfo } from "./database";
import { fetchWorldInfo, WorldNotFoundError } from "./vrchat-api";


export async function upsertWorldBookmark(worldId: string) {
    
  try {
    const world = await fetchWorldInfo(worldId);

    addOrUpdateWorldInfo(world);
  } catch (error) {
    if (error instanceof WorldNotFoundError) {
      deleteWorldInfo(worldId);
    }
  }
}

export function initializeApp() {
  initDB();
  runMigrations();

  ipcMain.handle("get_genres", async () => {
    const genres = getGenres();

    return genres;
  });

  ipcMain.handle("add_or_update_world_info", async (event, worldId: string) => {
    upsertWorldBookmark(worldId);
  });

  ipcMain.handle("get_world_info", async (event, worldId: string) => {
    return getWorldInfo(worldId);
  });

  ipcMain.handle("update_world_bookmark", async (event, worldId: string, genreId: number, worldNote: string) => {
    updateWorldBookmark(worldId, genreId, worldNote);
  });
}

