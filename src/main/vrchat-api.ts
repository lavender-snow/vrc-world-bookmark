import { ipcMain } from 'electron';

import { VRChatServerError, WorldNotFoundError } from 'src/errors/vrchat-errors';
import type { VRChatWorld } from 'src/types/vrchat';

function userAgent() {
  return `${process.env.APP_NAME}/${process.env.APP_VERSION} ${process.env.REPOSITORY}`;
}

export async function fetchWorldInfo(worldId: string) {
  const response = await fetch(`https://api.vrchat.cloud/api/1/worlds/${worldId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': userAgent(),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 404 && data.error?.status_code === 404) {
      throw new WorldNotFoundError(`World not found or deleted: ${worldId}`);
    } else if (response.status === 500) {
      throw new VRChatServerError(`VRChat server error: ${data.error?.message || 'Unknown error'}`);
    }
    throw new Error(`Error fetching world info: ${response.statusText}`);
  }

  return data as VRChatWorld;
}

ipcMain.handle('fetch_world_info', async (event, worldId: string) => {
  return await fetchWorldInfo(worldId);
});
