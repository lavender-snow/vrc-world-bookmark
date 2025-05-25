import { World } from "./vrchat.d.ts";
import type { VRChatWorldInfo } from "./renderer.d.ts";

declare global {
  interface Window {
    vrchatAPI: {
      fetchWorldInfo: (worldId: string) => Promise<World>;
    },
    dbAPI: {
      getGenres: () => Promise<Genre[]>;
      addOrUpdateWorldInfo: (worldId: string) => Promise<VRChatWorldInfo>;
      getWorldInfo: (worldId: string) => Promise<VRChatWorldInfo>;
      updateWorldBookmark: (world: World, genre_id: number, worldNote: string) => Promise<void>;
    };
  }
}

export {};
