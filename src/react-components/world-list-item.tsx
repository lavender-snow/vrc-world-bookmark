import style from './world-list-item.scss';

import { ReactComponent as ControllerIcon } from 'assets/images/IonGameControllerOutline.svg';
import { ReactComponent as CameraIcon } from 'assets/images/MaterialSymbolsAndroidCameraOutline.svg';
import { ReactComponent as RightArrowIcon } from 'assets/images/MaterialSymbolsArrowRightAltRounded.svg';
import { ReactComponent as SparklesIcon } from 'assets/images/MynauiSparkles.svg';
import { ReactComponent as SleepIcon } from 'assets/images/SolarMoonSleepBroken.svg';
import { ReactComponent as GhostIcon } from 'assets/images/TablerGhost2.svg';
import { GENRE } from 'src/consts/const';
import { useAppData } from 'src/contexts/app-data-provider';
import { VRChatWorldInfo } from 'src/types/renderer';

export function WorldListItem({ worldInfo, setWorldInfo }: { worldInfo: VRChatWorldInfo, setWorldInfo: (worldInfo: VRChatWorldInfo) => void }) {
  const { genres } = useAppData();

  return (
    <div className={style.worldListItem} onClick={() => setWorldInfo(worldInfo)}>
      <div className={style.worldThumbnailName}>
        <img src={worldInfo.thumbnailImageUrl} alt={worldInfo.name} />
        <span className={style.worldName}>{worldInfo.name}</span>
      </div>
      <div className={style.worldGenreIcons}>
        {worldInfo.genreIds.includes(GENRE.chill) && <div title={genres.find(genre => genre.id === GENRE.chill).name_jp ?? ''}><SleepIcon /></div>}
        {worldInfo.genreIds.includes(GENRE.high_quality) && <div title={genres.find(genre => genre.id === GENRE.high_quality).name_jp ?? ''}><SparklesIcon /></div>}
        {worldInfo.genreIds.includes(GENRE.game) && <div title={genres.find(genre => genre.id === GENRE.game).name_jp ?? ''}><ControllerIcon /></div>}
        {worldInfo.genreIds.includes(GENRE.horror) && <div title={genres.find(genre => genre.id === GENRE.horror).name_jp ?? ''}><GhostIcon /></div>}
        {worldInfo.genreIds.includes(GENRE.photo_spot) && <div title={genres.find(genre => genre.id === GENRE.photo_spot).name_jp ?? ''}><CameraIcon /></div>}
      </div>
      <div>
        <RightArrowIcon className={style.openWorldCard}/>
      </div>
    </div>
  );
}
