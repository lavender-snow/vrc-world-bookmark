import { contextBridge, ipcRenderer } from 'electron';

import type { BookmarkListOptions, UpdateWorldBookmarkOptions, UpdateWorldGenresOptions } from './types/renderer';
import type { LoginInput, TwoFactorInput, VRChatAuthAPI } from './types/vrchat-auth';

const vrchatAuth: VRChatAuthAPI = {
  getAuthState: () => ipcRenderer.invoke('vrchat_auth_state'),
  restoreSession: () => ipcRenderer.invoke('vrchat_auth_restore'),
  login: (input: LoginInput) => ipcRenderer.invoke('vrchat_auth_login', input),
  verifyTwoFactor: (input: TwoFactorInput) => ipcRenderer.invoke('vrchat_auth_verify', input),
  logout: () => ipcRenderer.invoke('vrchat_auth_logout'),
};
contextBridge.exposeInMainWorld('vrchatAuth', vrchatAuth);

contextBridge.exposeInMainWorld('vrchatAPI', {
  fetchWorldInfo: (worldId: string) => ipcRenderer.invoke('fetch_world_info', worldId),
});

contextBridge.exposeInMainWorld('dbAPI', {
  getGenres: () => ipcRenderer.invoke('get_genres'),
  getVisitStatuses: () => ipcRenderer.invoke('get_visit_statuses'),
  addOrUpdateWorldInfo: (worldId: string) => ipcRenderer.invoke('add_or_update_world_info', worldId),
  getWorldInfo: (worldId: string) => ipcRenderer.invoke('get_world_info', worldId),
  updateWorldBookmark: (options: UpdateWorldBookmarkOptions) => ipcRenderer.invoke('update_world_bookmark', options),
  updateWorldGenres: (options: UpdateWorldGenresOptions) => ipcRenderer.invoke('update_world_genres', options),
  getBookmarkList: (options: BookmarkListOptions) => ipcRenderer.invoke('get_bookmark_list', options),
  getWorldIdsToUpdate: () => ipcRenderer.invoke('get_world_ids_to_update'),
  getRandomRecommendedWorld: () => ipcRenderer.invoke('get_random_recommended_world'),
  getLLMRecommendWorld: (requestMessage: string) => ipcRenderer.invoke('get_llm_recommend_world', requestMessage),
});

contextBridge.exposeInMainWorld('credentialStore', {
  saveKey: (key: string, value: string) => ipcRenderer.invoke('save_key', key, value),
  loadKey: (key: string) => ipcRenderer.invoke('load_key', key),
  isKeySaved: (key: string) => ipcRenderer.invoke('is_key_saved', key),
});
