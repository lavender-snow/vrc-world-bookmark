import style from './view-type-area.scss';

import { ReactComponent as GridIcon } from 'assets/images/MaterialSymbolsLightFeaturedPlayListOutline.svg';
import { ReactComponent as ListIcon } from 'assets/images/MaterialSymbolsListAltOutline.svg';
import { VIEW_TYPES } from 'src/consts/const';
import { useBookmarkListState } from 'src/contexts/bookmark-list-provider';

export function ViewTypeArea() {
  const { viewType, setViewType } = useBookmarkListState();

  return (
    <div className={style.viewTypeArea}>
      <div className={style.viewTypeWrap}>
        <div className={viewType === VIEW_TYPES.list ? style.activeViewButton : style.viewButton} onClick={() => setViewType(VIEW_TYPES.list)}>
          <ListIcon />
        </div>
        <div className={viewType === VIEW_TYPES.grid ? style.activeViewButton : style.viewButton} onClick={() => setViewType(VIEW_TYPES.grid)}>
          <GridIcon />
        </div>
      </div>
    </div>
  );
}
