import { World } from "./vrchat.d.ts";

declare global {
  interface Window {
    vrchatAPI: {
      fetchWorldInfo: (worldId: string) => Promise<World>;
    },
    dbAPI: {
      getGenres: () => Promise<Genre[]>;
      addWorldBookmark: (world: World, genre_id: number, worldNote: string) => Promise<void>;
    };
  }
}

export {};
