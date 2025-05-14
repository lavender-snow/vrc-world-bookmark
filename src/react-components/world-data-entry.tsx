import { useState } from 'react';
import { Button } from './common/button';
import { InputText } from './common/input-text';
import classNames from 'classnames';
import styles from './world-data-entry.scss';
import { getWorldId } from '../utils/util';

export function WorldDataEntry() {
  const [worldIdOrUrl, setWorldIdOrUrl] = useState<string>('');

  function onChangeWorldIdOrUrl(e: React.ChangeEvent<HTMLInputElement>) {
    setWorldIdOrUrl(e.target.value);
  }

  async function onClickGetWorldInfo() {
    const worldId = getWorldId(worldIdOrUrl);

    if (worldId) {
      const response = await window.vrchatAPI.fetchWorldInfo(worldId);
      console.log(response);
    }
  }

  return (
    <>
      <p>追加したいワールドのIDまたはURLを入力してください</p>

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
    </>
  );
}
