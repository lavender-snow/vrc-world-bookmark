import { contextBridge, ipcRenderer } from "electron";
import type { BookmarkListOptions, UpdateWorldBookmarkOptions } from "./types/renderer";

contextBridge.exposeInMainWorld('vrchatAPI', {
  fetchWorldInfo: (worldId: string) => ipcRenderer.invoke("fetch_world_info", worldId),
});

contextBridge.exposeInMainWorld('dbAPI', {
  getGenres: () => ipcRenderer.invoke("get_genres"),
  getVisitStatuses: () => ipcRenderer.invoke("get_visit_statuses"),
  addOrUpdateWorldInfo: (worldId: string) => ipcRenderer.invoke("add_or_update_world_info", worldId),
  getWorldInfo: (worldId: string) => ipcRenderer.invoke("get_world_info", worldId),
  updateWorldBookmark: (options: UpdateWorldBookmarkOptions) => ipcRenderer.invoke("update_world_bookmark", options),
  getBookmarkList: (options: BookmarkListOptions = {selectedGenres: [], selectedVisitStatuses: []}) => ipcRenderer.invoke("get_bookmark_list", options),
})
