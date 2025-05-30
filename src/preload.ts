import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld('vrchatAPI', {
  fetchWorldInfo: (worldId: string) => ipcRenderer.invoke("fetch_world_info", worldId),
});

contextBridge.exposeInMainWorld('dbAPI', {
  getGenres: () => ipcRenderer.invoke("get_genres"),
  getVisitStatuses: () => ipcRenderer.invoke("get_visit_statuses"),
  addOrUpdateWorldInfo: (worldId: string) => ipcRenderer.invoke("add_or_update_world_info", worldId),
  getWorldInfo: (worldId: string) => ipcRenderer.invoke("get_world_info", worldId),
  updateWorldBookmark: (worldId: string, genreId: number, worldNote: string) => ipcRenderer.invoke("update_world_bookmark", worldId, genreId, worldNote)
})
