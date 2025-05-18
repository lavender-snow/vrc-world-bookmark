import { contextBridge, ipcRenderer } from "electron";
import type { VRChatWorld } from "./types/vrchat";

contextBridge.exposeInMainWorld('vrchatAPI', {
  fetchWorldInfo: (worldId: string) => ipcRenderer.invoke("fetch_world_info", worldId),
});

contextBridge.exposeInMainWorld('dbAPI', {
  getGenres: () => ipcRenderer.invoke("get_genres"),
  addWorldBookmark: (world: VRChatWorld, genreId: number, worldNote: string) => ipcRenderer.invoke("add_world_bookmark", world, genreId, worldNote),
})
