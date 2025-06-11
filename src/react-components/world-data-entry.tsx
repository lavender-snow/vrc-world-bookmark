import classNames from 'classnames';
import { useCallback, useState } from 'react';

import { Button } from './common/button';
import { InputText } from './common/input-text';
import { WorldCard } from './world-card';
import styles from './world-data-entry.scss';

import { NoticeType } from 'src/consts/const';
import { useToast } from 'src/contexts/toast-provider';
import { useWorldDataEntryState } from 'src/contexts/world-data-entry-provider';
import { debounce, getWorldId } from 'src/utils/util';

export function WorldDataEntry() {
  const { addToast } = useToast();
  const {worldIdOrUrl, setWorldIdOrUrl, vrchatWorldInfo, setVRChatWorldInfo}= useWorldDataEntryState();
  const [isWorldIdOrUrl, setIsWorldIdOrUrl] = useState<boolean>(getWorldId(worldIdOrUrl) !== null);

  const debouncedSetIsWorldIdOrUrl = useCallback(
    debounce((value: string) => {
      setIsWorldIdOrUrl(getWorldId(value) !== null);
    }, 500),
    [],
  );

  function onChangeWorldIdOrUrl(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;
    setWorldIdOrUrl(newValue);
    debouncedSetIsWorldIdOrUrl(newValue);
  }

  function onKeyDownInputText(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      onClickGetWorldInfo();
    }
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
    } else {
      addToast('ワールドIDまたはURLが無効です。正しい形式で入力してください。', NoticeType.error);
    }
  }

  const validInput = worldIdOrUrl.length > 0 && isWorldIdOrUrl;
  const invalidInput = worldIdOrUrl.length > 0 && !isWorldIdOrUrl;

  return (
    <div className={classNames(styles.worldDataEntry)}>
      <div className={classNames(styles.searchArea)}>
        <InputText
          value={worldIdOrUrl}
          onChange={onChangeWorldIdOrUrl}
          onKeyDown={onKeyDownInputText}
          onBlur={() => setIsWorldIdOrUrl(getWorldId(worldIdOrUrl) !== null)}
          placeholder='World ID or World URL'
          className={classNames([
            styles.searchInputText,
            validInput && styles.validInput,
            invalidInput && styles.invalidInput,
          ])}
        />
        <Button disabled={worldIdOrUrl.length === 0} onClick={onClickGetWorldInfo} className={classNames(styles.searchButton)}>
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
