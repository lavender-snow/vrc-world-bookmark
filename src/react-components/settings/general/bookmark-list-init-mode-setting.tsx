import styles from './bookmark-list-init-mode-setting.scss';

import { BOOKMARK_LIST_INIT_MODE_ID, BookmarkListInitModeId } from 'src/consts/const';
import { useSettingsTabState } from 'src/contexts/settings-tab-provider';

export function BookmarkListInitModeSetting() {
  const { bookmarkListInitMode, onChangeBookmarkListInitMode } = useSettingsTabState();

  return (
    <>
      <span>
        アプリ起動時のワールド一覧画面の状態を設定します。<br />
      </span>
      <div className={styles.modeSetting} >
        <label className={styles.modeWrapper}>
          <input
            type="radio"
            name="bookmarkListInitMode"
            value={BOOKMARK_LIST_INIT_MODE_ID.default}
            checked={bookmarkListInitMode === BOOKMARK_LIST_INIT_MODE_ID.default}
            onChange={(e) => {onChangeBookmarkListInitMode(e.target.value as BookmarkListInitModeId);}}
          />
          <strong>デフォルト</strong>
          <p>すべての登録ワールド情報が登録日順で表示されます。</p>
        </label>
        <label  className={styles.modeWrapper}>
          <input
            type="radio"
            name="bookmarkListInitMode"
            value={BOOKMARK_LIST_INIT_MODE_ID.discovery}
            checked={bookmarkListInitMode === BOOKMARK_LIST_INIT_MODE_ID.discovery}
            onChange={(e) => {onChangeBookmarkListInitMode(e.target.value as BookmarkListInitModeId);}}
          />
          <strong>ディスカバリー</strong>
          <p>高品質タグ付きの未訪問または訪問中ワールドが表示されます。<br />ワールド探索を目的としている場合におすすめです。</p>
        </label>
      </div>
    </>
  );
};
