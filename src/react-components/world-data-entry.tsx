import classNames from 'classnames';

import { Button } from './common/button';
import { InputText } from './common/input-text';
import { WorldCard } from './world-card';
import styles from './world-data-entry.scss';

import { NoticeType } from 'src/consts/const';
import { useToast } from 'src/contexts/toast-provider';
import { useWorldDataEntryState } from 'src/contexts/world-data-entry-provider';
import { getWorldId } from 'src/utils/util';

export function WorldDataEntry() {
  const { addToast } = useToast();
  const {worldIdOrUrl, setWorldIdOrUrl, vrchatWorldInfo, setVRChatWorldInfo}= useWorldDataEntryState();

  function onChangeWorldIdOrUrl(e: React.ChangeEvent<HTMLInputElement>) {
    setWorldIdOrUrl(e.target.value);
  }

  async function onClickGetWorldInfo() {
    const worldId = getWorldId(worldIdOrUrl);

    if (worldId) {
      const response = await window.dbAPI.addOrUpdateWorldInfo(worldId);

      if (response.error) {
        addToast(`ワールド情報の取得に失敗しました。エラー: ${response.error}`, NoticeType.error);
      } else if (response.data) {
        addToast('ワールド情報を取得しました。', NoticeType.success);
        setVRChatWorldInfo(response.data);
      } else {
        addToast('予期せぬエラーが発生しました。', NoticeType.error);
      }
    }
  }

  return (
    <div className={classNames(styles.worldDataEntry)}>
      <div className={classNames(styles.searchArea)}>
        <InputText
          value={worldIdOrUrl}
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
