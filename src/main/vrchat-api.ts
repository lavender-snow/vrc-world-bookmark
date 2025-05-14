import { ipcMain } from "electron";

function userAgent() {
    return `${process.env.APP_NAME}/${process.env.APP_VERSION} ${process.env.REPOSITORY}`
}

ipcMain.handle("fetch_world_info", async (event, worldId: string) => {
  const response = await fetch(`https://api.vrchat.cloud/api/1/worlds/${worldId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": userAgent(),
    },
  });

  if (!response.ok) {
    throw new Error(`Error fetching world info: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
});
