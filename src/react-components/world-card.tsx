import classNames from "classnames";
import { useState, useEffect } from "react";
import type { VRChatWorldInfo } from "../types/renderer";
import type { Genre } from '../types/table';
import style from "./world-card.scss";
import { ReactComponent as DatabaseSyncIcon } from "../../assets/images/MdiDatabaseSync.svg";
import { ReactComponent as MailSendIcon } from "../../assets/images/IconoirSendMail.svg";
import { ReactComponent as ClipboardIcon } from "../../assets/images/MdiClipboardTextOutline.svg";
import { Button } from "./common/button";
import { writeClipboard } from "../utils/util";
import { Toast } from "../utils/toast";
import { NoticeType } from "../consts/const";

function WorldProperty({ name, value }: { name: string, value: string | number }) {
  return (
    <div className={classNames(style.worldProperty)}>
      <div className={classNames(style.worldPropertyName)}>{name}</div>
      <div className={style.worldPropertyValue}>{value}</div>
    </div>
  )
}

function WorldTags({ tags }: { tags: string[] }) {
  return (
    <div className={style.worldTags}>
      {tags.map((tag) => (
        <div key={tag} className={classNames(
          style.worldTag,
          tag.toLowerCase() === "chill" && style.chillWorldTag,
          tag.toLowerCase() === "horror" && style.horrorWorldTag,
        )}>
          {tag}
        </div>
      ))}
    </div>
  )
}

export function WorldCard({ worldInfo, genres }: { worldInfo: VRChatWorldInfo, genres: Genre[] }) {
  const [selectedGenreId, setSelectedGenreId] = useState<number>(worldInfo.genreId);
  const [worldNote, setWorldNote] = useState<string>(worldInfo.note);
  const [toast, setToast] = useState<string>("");
  const [toastNoticeType, setToastNoticeType] = useState<NoticeType>(NoticeType.info);

  function onClipboardClick() {
    writeClipboard(worldInfo.name);
    setToastNoticeType(NoticeType.success);
    setToast("ワールド名をコピーしました");
  }

  function onUpdateWorldBookmarkClick() {
    try {
      window.dbAPI.updateWorldBookmark(worldInfo.id, selectedGenreId, worldNote);
      setToastNoticeType(NoticeType.success);
      setToast("情報を更新しました");
    } catch (error) {
      console.error("Failed to update world bookmark:", error);
      setToastNoticeType(NoticeType.error);
      setToast("情報の更新に失敗しました");
    }
  }

  useEffect(() => {
    setWorldNote(worldInfo.note);
    setSelectedGenreId(worldInfo.genreId);
  }, [worldInfo.genreId, worldInfo.note]);

  return (
    <div className={classNames(style.worldCard)}>
      <div className={style.worldTitle}>
        <h2>
          <a href={`https://vrchat.com/home/world/${worldInfo.id}`} target="_blank" rel="noopener noreferrer">{worldInfo.name}</a><ClipboardIcon onClick={() => { onClipboardClick() }} /><small>by {worldInfo.authorName}</small>
        </h2>
      </div>
      <div className={style.worldInfoArea}>
        <div className={classNames(style.thumbnailArea)}>
          <img src={worldInfo.thumbnailImageUrl} alt={worldInfo.name} />
        </div>

        <div className={classNames(style.infoArea)}>
          <div className={classNames(style.worldProperties)}>
            <WorldProperty name="お気に入り" value={worldInfo.favorites.toLocaleString()} />
            <WorldProperty name="訪問" value={worldInfo.visits.toLocaleString()} />
            <WorldProperty name="定員" value={worldInfo.capacity} />
            <WorldProperty name="作成日" value={new Date(worldInfo.createdAt).toLocaleDateString()} />
            <WorldProperty name="更新日" value={new Date(worldInfo.updatedAt).toLocaleDateString()} />
            <WorldProperty name="説明" value={worldInfo.description} />
          </div>
          <WorldTags tags={worldInfo.tags} />
        </div>
      </div>
      <div className={style.bookmarkArea}>
        <div className={style.memoArea}>
          メモ <textarea maxLength={1024} placeholder="ワールドの補足情報を入力" onChange={(e) => { setWorldNote(e.target.value) }} value={worldNote}></textarea>
        </div>
        <div className={style.genreArea}>
          ジャンル
          {genres.map((genre) => (
            <label key={genre.id} >
              <input
                type="radio"
                name="genre"
                value={genre.id}
                checked={selectedGenreId === genre.id}
                onChange={() => setSelectedGenreId(genre.id)}
              />
              {genre.name_jp}
            </label>
          ))}
        </div>
        <Button className={style.bookmarkButton} onClick={() => { onUpdateWorldBookmarkClick() }}>
          <DatabaseSyncIcon width={16} height={16} />登録データ更新
        </Button>

        <Button className={style.inviteButton} onClick={() => { }} disabled={true}><MailSendIcon width={20} height={20} />Invite</Button>
      </div>
      <Toast message={toast} onClose={() => { setToast("") }} noticeType={toastNoticeType} />
    </div >
  );
}
