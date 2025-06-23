import { WorldUpdateProgress } from './world-update-progress';

import { ReactComponent as ToolboxIcon } from 'assets/images/MdiToolboxOutline.svg';
import { SettingItem } from 'src/react-components/settings/setting-item';
import { SettingsHeader } from 'src/react-components/settings/settings-header';

export function GeneralSettings() {
  return (
    <>
      <SettingsHeader Icon={ToolboxIcon} title="一般" />
      <SettingItem
        title="ワールドデータ更新"
      >
        <WorldUpdateProgress />
      </SettingItem>
    </>
  );
}
