import { useEffect, useState } from 'react';
import { Button } from './common/button';
import { InputText } from './common/input-text';
import classNames from 'classnames';
import styles from './world-data-entry.scss';
import { getWorldId } from '../utils/util';
import { WorldCard } from './world-card';
import type { VRChatWorld } from '../types/vrchat';
import type { Genre } from '../types/table';
import { mockWorld } from '../mocks/mock-world';

export function WorldDataEntry() {
  const [worldIdOrUrl, setWorldIdOrUrl] = useState<string>('');
  const [vrchatWorld, setVRChatWorld] = useState<VRChatWorld | null>(mockWorld);
  const [genres, setGenres] = useState<Genre[]>();

  useEffect(() => {
    async function fetchGenres() {
      const response = await window.dbAPI.getGenres();

      setGenres(response);
    }

    fetchGenres();
  }, []);


  function onChangeWorldIdOrUrl(e: React.ChangeEvent<HTMLInputElement>) {
    setWorldIdOrUrl(e.target.value);
  }

  async function onClickGetWorldInfo() {
    const worldId = getWorldId(worldIdOrUrl);

    if (worldId) {
      const response = await window.vrchatAPI.fetchWorldInfo(worldId);
      setVRChatWorld(response);
    }
  }

  return (
    <div className={classNames(styles.worldDataEntry)}>
      <div className={classNames(styles.searchArea)}>
        <InputText
          onChange={onChangeWorldIdOrUrl}
          placeholder='World ID or World URL'
          className={classNames(styles.searchInputText)}
        />
        <Button onClick={onClickGetWorldInfo} className={classNames(styles.searchButton)}>
          ワールド情報取得
        </Button>
      </div>

      <div className={classNames(styles.searchResult)}>
        {genres && vrchatWorld && (
          <WorldCard world={vrchatWorld} genres={genres} />
        )}
      </div>
    </div>
  );
}
