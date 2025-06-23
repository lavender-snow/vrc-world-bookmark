import { SettingItem } from './setting-item';
import { SettingsHeader } from './settings-header';
import { WorldUpdateProgress } from './world-update-progress';

export function GeneralSettings() {
  return (
    <>
      <SettingsHeader title="一般" />
      <SettingItem
        title="ワールドデータ更新"
      >
        <WorldUpdateProgress />
      </SettingItem>
    </>
  );
}
