import styles from './world-update-progress.scss';

import { WORLD_UPDATE_INFO_STATUS } from 'src/consts/const';
import { useSettingsTabState } from 'src/contexts/settings-tab-provider';
import { Button } from 'src/react-components/common/button';

const UPDATE_DELAY_MS = 1000;

export function WorldUpdateProgress() {
  const {
    updateTargetTotal, setUpdateTargetTotal,
    processedCount, setProcessedCount,
    worldInfoIsUpdating, setWorldInfoIsUpdating,
    worldInfoUpdateStatus, setWorldInfoUpdateStatus,
  } =useSettingsTabState();

  async function handleUpdate() {
    setWorldInfoIsUpdating(true);
    setProcessedCount(0);
    setWorldInfoUpdateStatus(WORLD_UPDATE_INFO_STATUS.updating);

    const worldIds = await window.dbAPI.getWorldIdsToUpdate();
    setUpdateTargetTotal(worldIds.length);

    if (worldIds.length === 0) {
      setWorldInfoIsUpdating(false);
      setWorldInfoUpdateStatus(WORLD_UPDATE_INFO_STATUS.noTarget);
      return;
    }

    for (let i = 0; i < worldIds.length; i++) {
      try {
        await window.dbAPI.addOrUpdateWorldInfo(worldIds[i]);
      } catch (e) {
        console.error(`Failed to update world ${worldIds[i]}:`, e);
        setWorldInfoIsUpdating(false);
        setWorldInfoUpdateStatus(WORLD_UPDATE_INFO_STATUS.error);
        return;
      }
      setProcessedCount(i + 1);
      await new Promise(res => setTimeout(res, UPDATE_DELAY_MS));
    }

    setWorldInfoIsUpdating(false);
    setWorldInfoUpdateStatus(WORLD_UPDATE_INFO_STATUS.completed);
  }


  return (
    <>
      <span>
        24時間以上前に取得したワールドデータを対象に最新情報へ更新します。VRChatサーバーへの負荷軽減のため1件ごとに1秒待機します。
      </span>
      <div className={styles.worldUpdateProgress}>
        <div className={styles.progressArea}>
          {worldInfoUpdateStatus === WORLD_UPDATE_INFO_STATUS.idle && <div className={styles.progressLabel}>未実行</div>}
          {worldInfoUpdateStatus === WORLD_UPDATE_INFO_STATUS.updating && <div className={styles.progressLabel}>更新中: {processedCount} / {updateTargetTotal}</div>}
          {worldInfoUpdateStatus === WORLD_UPDATE_INFO_STATUS.noTarget && <div className={styles.progressLabel}>更新対象なし</div>}
          {worldInfoUpdateStatus === WORLD_UPDATE_INFO_STATUS.error && <div className={styles.progressLabel}>更新中にエラーが発生しました</div>}
          {worldInfoUpdateStatus === WORLD_UPDATE_INFO_STATUS.completed && <div className={styles.progressLabel}>更新完了: {processedCount} / {updateTargetTotal}</div>}
          <progress
            value={processedCount}
            max={updateTargetTotal || 1}
            className={worldInfoUpdateStatus === WORLD_UPDATE_INFO_STATUS.completed ? styles.progressBarCompleted : styles.progressBar}
          />
        </div>
        <Button onClick={handleUpdate} disabled={worldInfoIsUpdating} className={styles.updateButton}>更新</Button>
      </div>
    </>
  );
}
