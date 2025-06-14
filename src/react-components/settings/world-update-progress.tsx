import style from './world-update-progress.scss';

import { WORLD_UPDATE_INFO_STATUS } from 'src/consts/const';
import { useSettingsTabState } from 'src/contexts/settings-tab-provider';
import { Button } from 'src/react-components/common/button';

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
        break;
      }
      setProcessedCount(i + 1);
      await new Promise(res => setTimeout(res, 1000));
    }

    setWorldInfoIsUpdating(false);
    setWorldInfoUpdateStatus(WORLD_UPDATE_INFO_STATUS.completed);
  }


  return (
    <div className={style.worldUpdateProgress}>
      <div className={style.progressArea}>
        {worldInfoUpdateStatus === WORLD_UPDATE_INFO_STATUS.idle && <div className={style.progressLabel}>未実行</div>}
        {worldInfoUpdateStatus === WORLD_UPDATE_INFO_STATUS.updating && <div className={style.progressLabel}>更新中: {processedCount} / {updateTargetTotal}</div>}
        {worldInfoUpdateStatus === WORLD_UPDATE_INFO_STATUS.noTarget && <div className={style.progressLabel}>更新対象なし</div>}
        {worldInfoUpdateStatus === WORLD_UPDATE_INFO_STATUS.error && <div className={style.progressLabel}>更新中にエラーが発生しました</div>}
        {worldInfoUpdateStatus === WORLD_UPDATE_INFO_STATUS.completed && <div className={style.progressLabel}>更新完了: {processedCount} / {updateTargetTotal}</div>}
        <progress
          value={processedCount}
          max={updateTargetTotal || 1}
          className={worldInfoUpdateStatus === WORLD_UPDATE_INFO_STATUS.completed ? style.progressBarCompleted : style.progressBar}
        />
      </div>
      <Button onClick={handleUpdate} disabled={worldInfoIsUpdating} className={style.updateButton}>更新</Button>
    </div>
  );
}
