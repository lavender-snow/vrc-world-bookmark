import classNames from 'classnames';
import { useState } from 'react';

import { NoticeType } from '../consts/const';
import { useWorldDataEntryState } from '../contexts/world-data-entry-provider';
import { Toast } from '../utils/toast';
import { getWorldId } from '../utils/util';

import { Button } from './common/button';
import { InputText } from './common/input-text';
import { WorldCard } from './world-card';
import styles from './world-data-entry.scss';




export function WorldDataEntry() {
  const [toast, setToast] = useState<string>('');
  const [toastNoticeType, setToastNoticeType] = useState<NoticeType>(NoticeType.info);

  const {worldIdOrUrl, setWorldIdOrUrl, vrchatWorldInfo, setVRChatWorldInfo}= useWorldDataEntryState();

  function onChangeWorldIdOrUrl(e: React.ChangeEvent<HTMLInputElement>) {
    setWorldIdOrUrl(e.target.value);
  }

  async function onClickGetWorldInfo() {
    const worldId = getWorldId(worldIdOrUrl);

    if (worldId) {
      const response = await window.dbAPI.addOrUpdateWorldInfo(worldId);

      if (response.error) {
        setToastNoticeType(NoticeType.error);
        setToast(`ワールド情報の取得に失敗しました。エラー: ${response.error}`);
      } else if (response.data) {
        setVRChatWorldInfo(response.data);
        setToastNoticeType(NoticeType.success);
        setToast('ワールド情報を取得しました。');
      } else {
        setToastNoticeType(NoticeType.error);
        setToast('予期せぬエラーが発生しました。');
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
      <Toast message={toast} onClose={() => { setToast(''); }} noticeType={toastNoticeType} />
    </div>
  );
}
