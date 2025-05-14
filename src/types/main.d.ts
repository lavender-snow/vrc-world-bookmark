import { World } from "./vrchat.d.ts";

declare global {
  interface Window {
    vrchatAPI: {
      fetchWorldInfo: (worldId: string) => Promise<World>;
    }
  }
}

export {};
