import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld('vrchatAPI', {
  fetchWorldInfo: (worldId: string) => ipcRenderer.invoke("fetch_world_info", worldId),
});
