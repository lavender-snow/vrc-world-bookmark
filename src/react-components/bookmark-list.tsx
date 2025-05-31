import { useState, useEffect } from "react";
import type { VRChatWorldInfo } from "../types/renderer";
import { WorldCard } from "./world-card";
import style from "./bookmark-list.scss";

export function BookmarkList() {
  const [bookmarkList, setBookmarkList] = useState<VRChatWorldInfo[]>([]);

  async function getBookmarkList() {
    const result = await window.dbAPI.getBookmarkList({});
    setBookmarkList(result);
  }

  useEffect(() => {
    getBookmarkList();
  }, []);

  return (
    <>
      <div className={style.worldCardList}>
        {bookmarkList && bookmarkList.map((worldInfo) => (
          <WorldCard key={worldInfo.id} worldInfo={worldInfo} />
        ))}
      </div>
    </>
  );
}
