import classNames from "classnames";
import { useState, useEffect, useCallback, useRef } from "react";
import type { UpdateWorldBookmarkOptions, UpdateWorldGenresOptions, VRChatWorldInfo } from "../types/renderer";
import style from "./world-card.scss";
import { ReactComponent as MailSendIcon } from "../../assets/images/IconoirSendMail.svg";
import { ReactComponent as ClipboardIcon } from "../../assets/images/MdiClipboardTextOutline.svg";
import { Button } from "./common/button";
import { debounce, writeClipboard } from "../utils/util";
import { Toast } from "../utils/toast";
import { NoticeType } from "../consts/const";
import { useAppData } from '../contexts/AppDataProvider';
import { DropDownList, SelectOption } from "./common/drop-down-list";
import { CheckboxGroup } from "./common/checkbox-group";

function WorldProperty({ name, value }: { name: string, value: string | number }) {
  return (
    <div className={classNames(style.worldProperty)}>
      <div className={classNames(style.worldPropertyName)}>{name}</div>
      <div className={style.worldPropertyValue}>{value}</div>
    </div>
  );
}

function WorldTags({ tags }: { tags: string[] }) {
  return (
    <div className={style.worldTags}>
      {tags.map((tag) => (
        <div key={tag} className={classNames(
          style.worldTag,
          tag.toLowerCase() === "author_tag_chill" && style.chillWorldTag,
          tag.toLowerCase() === "author_tag_horror" && style.horrorWorldTag,
          tag.toLowerCase() === "author_tag_game" && style.gameWorldTag,
          tag.startsWith("admin_") && style.adminWorldTag,
        )}>
          {tag}
        </div>
      ))}
    </div>
  );
}

export function WorldCard({ worldInfo }: { worldInfo: VRChatWorldInfo }) {
  const [selectedGenreIds, setSelectedGenreIds] = useState<number[]>(worldInfo.genreIds);
  const [debouncedSelectedGenreIds, setDebouncedSelectedGenreIds] = useState<number[]>(worldInfo.genreIds);
  const [worldNote, setWorldNote] = useState<string>(worldInfo.note);
  const [visitStatusId, setVisitStatusId] = useState<number>(worldInfo.visitStatusId);
  const [toast, setToast] = useState<string>("");
  const [toastNoticeType, setToastNoticeType] = useState<NoticeType>(NoticeType.info);
  const [lastSaveNote, setLastSavedNote] = useState<string>(worldInfo.note);
  const genres = useAppData().genres;
  const visitStatuses = useAppData().visitStatuses;

  function onClipboardClick() {
    writeClipboard(worldInfo.name);
    setToastNoticeType(NoticeType.success);
    setToast("ワールド名をコピーしました");
  }

  async function handleUpdateWorldBookmark(options: UpdateWorldBookmarkOptions) {
    try {
      await window.dbAPI.updateWorldBookmark(options);
      setToastNoticeType(NoticeType.success);
      setToast("ブックマークを更新しました");
    } catch (error) {
      console.error("Failed to update world bookmark:", error);
      setToastNoticeType(NoticeType.error);
      setToast("ブックマークの更新に失敗しました");
    }
  }

  async function handleUpdateWorldGenres(options: UpdateWorldGenresOptions) {
    try {
      await window.dbAPI.updateWorldGenres(options);
      setToastNoticeType(NoticeType.success);
      setToast("ジャンル設定を更新しました");
    } catch (error) {
      console.error("Failed to update world genres:", error);
      setToastNoticeType(NoticeType.error);
      setToast("ジャンル設定の更新に失敗しました");
    }
  }

  const prevGenreIdsRef = useRef<number[]>(worldInfo.genreIds);

  useEffect(() => {
    const prev = prevGenreIdsRef.current;
    const currentGenreIds = debouncedSelectedGenreIds;
    const isSame = prev.length === currentGenreIds.length && prev.every((v, i) => v === currentGenreIds[i]);
    if (!isSame) {
      handleUpdateWorldGenres({ worldId: worldInfo.id, genreIds: currentGenreIds });
      prevGenreIdsRef.current = [...currentGenreIds];
    }
  }, [debouncedSelectedGenreIds]);

  const debouncedSelectedGenres = useCallback(
    debounce((genreIds: number[]) => {
      setDebouncedSelectedGenreIds(genreIds);
    }, 500),
    [],
  );

  function onGenresChange(genreIds: number[]) {
    setSelectedGenreIds(genreIds);
    debouncedSelectedGenres(genreIds);
  }

  function onVisitStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const visitStatusId = parseInt(e.target.value, 10);
    setVisitStatusId(visitStatusId);
    handleUpdateWorldBookmark({ worldId: worldInfo.id, visitStatusId: visitStatusId });
  }

  function onNoteBlur() {
    if (worldNote === lastSaveNote) return;

    handleUpdateWorldBookmark({ worldId: worldInfo.id, note: worldNote });
    setLastSavedNote(worldNote);
  }

  useEffect(() => {
    setWorldNote(worldInfo.note);
    setSelectedGenreIds(worldInfo.genreIds);
    setVisitStatusId(worldInfo.visitStatusId);
    setLastSavedNote(worldInfo.note);
  }, [worldInfo]);

  const visitStatusesNames: SelectOption[] = visitStatuses.map((status) => {
    return { id: status.id.toString(), name: status.name_jp };
  });

  return (
    <div className={classNames(style.worldCard)}>
      <div className={style.worldTitle}>
        <h2>
          <a href={`https://vrchat.com/home/world/${worldInfo.id}`} target="_blank" rel="noopener noreferrer">{worldInfo.name}</a><span onClick={() => { onClipboardClick(); }} aria-label={"ワールド名をコピー"}><ClipboardIcon /></span><small>by {worldInfo.authorName}</small>
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
          <strong>メモ</strong> <textarea maxLength={1024} placeholder="ワールドの補足情報を入力" onChange={(e) => { setWorldNote(e.target.value); }} onBlur={() => { onNoteBlur(); }} value={worldNote}></textarea>
        </div>
        <div className={style.genreArea}>
          <strong>ジャンル</strong>
          <CheckboxGroup
            options={genres}
            selected={selectedGenreIds}
            onChange={(genreIds) => onGenresChange(genreIds.map(Number))}
            allOption={false}
          />
        </div>
        <div className={style.visitInfo}>
          <strong>訪問状況</strong>
          <DropDownList options={visitStatusesNames} currentValue={visitStatusId?.toString()} onChange={onVisitStatusChange} />
        </div>

        <Button className={style.inviteButton} onClick={() => { }} disabled={true}><MailSendIcon width={20} height={20} />Invite</Button>
      </div>
      <Toast message={toast} onClose={() => { setToast(""); }} noticeType={toastNoticeType} />
    </div >
  );
}
