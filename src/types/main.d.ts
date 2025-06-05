import { World } from "./vrchat.d.ts";
import type { UpdateWorldBookmarkOptions, VRChatWorldInfo } from "./renderer.d.ts";

declare global {
  interface Window {
    vrchatAPI: {
      fetchWorldInfo: (worldId: string) => Promise<World>;
    },
    dbAPI: {
      getGenres: () => Promise<Genre[]>;
      getVisitStatuses: () => Promise<VisitStatus[]>;
      addOrUpdateWorldInfo: (worldId: string) => Promise<VRChatWorldInfo>;
      getWorldInfo: (worldId: string) => Promise<VRChatWorldInfo>;
      updateWorldBookmark: (options?: UpdateWorldBookmarkOptions) => Promise<void>;
      getBookmarkList: (options?: BookmarkListOptions) => Promise<{bookmarkList: VRChatWorldInfo[], totalCount: number}>;
    };
  }
}

export {};
