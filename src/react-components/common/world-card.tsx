import classNames from 'classnames';
import { useState, useEffect, useCallback, useRef } from 'react';

import { CheckboxGroup } from './checkbox-group';
import { DropDownList, SelectOption } from './drop-down-list';
import styles from './world-card.scss';
import { WorldTags } from './world-tags';

import { ReactComponent as ClipboardIcon } from 'assets/images/MdiClipboardTextOutline.svg';
import { NoticeType } from 'src/consts/const';
import { useAppData } from 'src/contexts/app-data-provider';
import { useToast } from 'src/contexts/toast-provider';
import type { UpdateWorldBookmarkOptions, UpdateWorldGenresOptions, VRChatWorldInfo } from 'src/types/renderer';
import { debounce, writeClipboard } from 'src/utils/util';

function WorldProperty({ name, value }: { name: string, value: string | number }) {
  return (
    <div className={classNames(styles.worldProperty)}>
      <div className={classNames(styles.worldPropertyName)}>{name}</div>
      <div className={styles.worldPropertyValue}>{value}</div>
    </div>
  );
}

function ThumbnailArea({ thumbnailImageUrl, worldName, releaseStatus }: {thumbnailImageUrl: string, worldName: string, releaseStatus: string}) {
  return (
    <div className={classNames(styles.thumbnailArea)}>
      <img src={thumbnailImageUrl} alt={worldName} />
      <span className={classNames(styles.releaseStatusBadge, releaseStatus === 'public' ? styles.public : styles.private)}>
        {releaseStatus === 'public' ? 'Public' : 'Private'}
      </span>
    </div>
  );
}

export function WorldCard({ worldInfo, setVRChatWorldInfo }: { worldInfo: VRChatWorldInfo, setVRChatWorldInfo: React.Dispatch<React.SetStateAction<VRChatWorldInfo | null>> }) {
  const [selectedGenreIds, setSelectedGenreIds] = useState<number[]>(worldInfo.genreIds);
  const [debouncedSelectedGenreIds, setDebouncedSelectedGenreIds] = useState<number[]>(worldInfo.genreIds);
  const [worldNote, setWorldNote] = useState<string>(worldInfo.note);
  const [visitStatusId, setVisitStatusId] = useState<number>(worldInfo.visitStatusId);
  const { addToast } = useToast();
  const [lastSaveNote, setLastSavedNote] = useState<string>(worldInfo.note);
  const { genres, visitStatuses, setLastUpdatedWorldInfo } = useAppData();

  function onClipboardClick() {
    writeClipboard(worldInfo.name);
    addToast('ワールド名をコピーしました', NoticeType.success);
  }

  function updateWorldInfo(newWorldInfo: VRChatWorldInfo) {
    setVRChatWorldInfo(newWorldInfo);
    setLastUpdatedWorldInfo(newWorldInfo);
  }

  async function handleUpdateWorldBookmark(options: UpdateWorldBookmarkOptions) {
    try {
      await window.dbAPI.updateWorldBookmark(options);

      if (options.note) {
        const newWorldInfo = { ...worldInfo, note: options.note };
        updateWorldInfo(newWorldInfo);

        addToast('メモを更新しました', NoticeType.success);
      }

      if(options.visitStatusId) {
        const newWorldInfo = { ...worldInfo, visitStatusId: options.visitStatusId };
        updateWorldInfo(newWorldInfo);

        addToast('訪問状況を更新しました', NoticeType.success);
      }
    } catch (error) {
      console.error('Failed to update world bookmark:', error);

      if (options.note) {
        addToast('メモの更新に失敗しました', NoticeType.error);
      }

      if(options.visitStatusId) {
        addToast('ブックマークの更新に失敗しました', NoticeType.error);
      }
    }
  }

  async function handleUpdateWorldGenres(options: UpdateWorldGenresOptions) {
    try {
      await window.dbAPI.updateWorldGenres(options);

      const newWorldInfo = { ...worldInfo, genreIds: options.genreIds };
      updateWorldInfo(newWorldInfo);

      addToast('ジャンル設定を更新しました', NoticeType.success);
    } catch (error) {
      console.error('Failed to update world genres:', error);
      addToast('ジャンル設定の更新に失敗しました', NoticeType.error);
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
    <div className={classNames(styles.worldCard)}>
      <div className={styles.worldTitle}>
        <h2>
          <a href={`https://vrchat.com/home/world/${worldInfo.id}`} target="_blank" rel="noopener noreferrer">{worldInfo.name}</a><span onClick={() => { onClipboardClick(); }} aria-label={'ワールド名をコピー'}><ClipboardIcon /></span><small>by {worldInfo.authorName}</small>
        </h2>
      </div>
      <div className={styles.worldInfoArea}>
        <ThumbnailArea thumbnailImageUrl={worldInfo.thumbnailImageUrl} worldName={worldInfo.name} releaseStatus={worldInfo.releaseStatus}/>
        <div className={classNames(styles.infoArea)}>
          <div className={classNames(styles.worldProperties)}>
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
      <div className={styles.bookmarkArea}>
        <div className={styles.memoArea}>
          <strong>メモ</strong> <textarea maxLength={1024} placeholder="ワールドの補足情報を入力" onChange={(e) => { setWorldNote(e.target.value); }} onBlur={() => { onNoteBlur(); }} value={worldNote}></textarea>
        </div>
        <div className={styles.genreArea}>
          <strong>ジャンル</strong>
          <CheckboxGroup
            options={genres}
            selected={selectedGenreIds}
            onChange={(genreIds) => onGenresChange(genreIds.map(Number))}
            allOption={false}
          />
        </div>
        <div className={styles.visitInfo}>
          <strong>訪問状況</strong>
          <DropDownList options={visitStatusesNames} currentValue={visitStatusId?.toString()} onChange={onVisitStatusChange} />
        </div>

        {/* TODO: インバイト機能はクリエイターガイドラインに反するため実装を見送りました。適切な方法で行えるようになった場合に実装します。
        <Button className={styles.inviteButton} onClick={() => { }} disabled={true}><MailSendIcon width={20} height={20} />Invite</Button>
        */}
      </div>
    </div >
  );
}
