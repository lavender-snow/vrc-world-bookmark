import { useState } from 'react';
import { Button } from './common/button';
import { InputText } from './common/input-text';
import classNames from 'classnames';
import styles from './world-data-entry.scss';
import { getWorldId } from '../utils/util';
import { WorldCard } from './world-card';
import type { VRChatWorldInfo } from '../types/renderer';

export function WorldDataEntry() {
  const [worldIdOrUrl, setWorldIdOrUrl] = useState<string>('');
  const [vrchatWorldInfo, setVRChatWorldInfo] = useState<VRChatWorldInfo | null>(null);

  function onChangeWorldIdOrUrl(e: React.ChangeEvent<HTMLInputElement>) {
    setWorldIdOrUrl(e.target.value);
  }

  async function onClickGetWorldInfo() {
    const worldId = getWorldId(worldIdOrUrl);

    if (worldId) {
      const response = await window.dbAPI.addOrUpdateWorldInfo(worldId);
      setVRChatWorldInfo(response);
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
          ワールド情報登録
        </Button>
      </div>

      <div className={classNames(styles.searchResult)}>
        {vrchatWorldInfo && (
          <WorldCard worldInfo={vrchatWorldInfo} />
        )}
      </div>
    </div>
  );
}
