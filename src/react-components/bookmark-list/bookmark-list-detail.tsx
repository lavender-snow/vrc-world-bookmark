import styles from './bookmark-list-detail.scss';

import { ReactComponent as LeftArrowIcon } from 'assets/images/MaterialSymbolsArrowBackRounded.svg';
import { WorldCard } from 'commonComponents/world-card';
import { useBookmarkListState } from 'src/contexts/bookmark-list-provider';
import { VRChatWorldInfo } from 'src/types/renderer';

export function BookmarkListDetail({ worldInfo, updateBookmarkList } : {worldInfo: VRChatWorldInfo, updateBookmarkList: (worldInfo: VRChatWorldInfo) => void }) {
  const { setListViewSelectedWorld } = useBookmarkListState();

  const setVRChatWorldInfo = (newWorldInfo: VRChatWorldInfo) => {
    updateBookmarkList(newWorldInfo);
    setListViewSelectedWorld(newWorldInfo);
  };

  return (
    <>
      <div className={styles.backButton} onClick={() => setListViewSelectedWorld(null)}><LeftArrowIcon /></div>
      <WorldCard worldInfo={worldInfo} setVRChatWorldInfo={setVRChatWorldInfo} />
    </>
  );
}
