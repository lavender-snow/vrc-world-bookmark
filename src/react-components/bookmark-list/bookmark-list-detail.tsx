import style from './bookmark-list-detail.scss';
import { WorldCard } from './world-card';

import { ReactComponent as LeftArrowIcon } from 'assets/images/MaterialSymbolsArrowBackRounded.svg';
import { useBookmarkListState } from 'src/contexts/bookmark-list-provider';
import { VRChatWorldInfo } from 'src/types/renderer';

export function BookmarkListDetail({worldInfo} : {worldInfo: VRChatWorldInfo}) {
  const { setListViewSelectedWorld } = useBookmarkListState();

  return (
    <>
      <div className={style.backButton} onClick={() => setListViewSelectedWorld(null)}><LeftArrowIcon /></div>
      <WorldCard worldInfo={worldInfo} />
    </>
  );
}
