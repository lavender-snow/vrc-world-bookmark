import type { UpdateWorldBookmarkOptions, UpdateWorldGenresOptions, VRChatWorldInfo } from './renderer.d.ts';
import { World } from './vrchat.d.ts';

declare global {
  interface Window {
    vrchatAPI: {
      fetchWorldInfo: (worldId: string) => Promise<World>;
    },
    dbAPI: {
      getGenres: () => Promise<Genre[]>;
      getVisitStatuses: () => Promise<VisitStatus[]>;
      addOrUpdateWorldInfo: (worldId: string) => Promise<{ data?: VRChatWorldInfo, error?: string }>;
      getWorldInfo: (worldId: string) => Promise<VRChatWorldInfo>;
      updateWorldBookmark: (options?: UpdateWorldBookmarkOptions) => Promise<void>;
      updateWorldGenres: (options: UpdateWorldGenresOptions) => Promise<void>;
      getBookmarkList: (options?: BookmarkListOptions) => Promise<{bookmarkList: VRChatWorldInfo[], totalCount: number}>;
      getWorldIdsToUpdate: () => Promise<string[]>;
    };
  }
}

export {};
