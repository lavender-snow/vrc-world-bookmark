import type { UpdateWorldBookmarkOptions, UpdateWorldGenresOptions, VRChatWorldInfo } from './renderer.d.ts';
import { World } from './vrchat.d.ts';

import type { Genre, VisitStatus, UpdateWorldBookmarkResult, BookmarkListOptions } from 'src/consts/const';

export interface RecommendResult {
  VRChatWorldInfo: VRChatWorldInfo;
  reason: string;
}

declare global {
  interface Window {
    vrchatAPI: {
      fetchWorldInfo: (worldId: string) => Promise<World>;
    },
    dbAPI: {
      getGenres: () => Promise<Genre[]>;
      getVisitStatuses: () => Promise<VisitStatus[]>;
      addOrUpdateWorldInfo: (worldId: string) => Promise<{ data?: VRChatWorldInfo, upsertResult: UpdateWorldBookmarkResult, error?: string }>;
      getWorldInfo: (worldId: string) => Promise<VRChatWorldInfo>;
      updateWorldBookmark: (options?: UpdateWorldBookmarkOptions) => Promise<boolean>;
      updateWorldGenres: (options: UpdateWorldGenresOptions) => Promise<boolean>;
      getBookmarkList: (options?: BookmarkListOptions) => Promise<{bookmarkList: VRChatWorldInfo[], totalCount: number}>;
      getWorldIdsToUpdate: () => Promise<string[]>;
      getRandomRecommendedWorld: () => Promise<{ data?: RecommendResult, error?: string}>;
      getLLMRecommendWorld: (requestMessage: string) => Promise<{data?: RecommendResult, error?: string}>;
    },
    credentialStore: {
      saveKey: (key: string, value: string) => Promise<void>;
      loadKey: (key: string) => Promise<string | null>;
      isKeySaved: (key: string) => Promise<boolean>;
    };
  }
}

export {};
