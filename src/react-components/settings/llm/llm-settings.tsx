
import { LLMSelect } from './llm-select';
import { BedrockSetting } from './service/bedrock-setting';
import { OpenAISetting } from './service/openai-setting';

import { ReactComponent as BrainIcon } from 'assets/images/HugeiconsAiBrain03.svg';
import { LLM_API_SERVICE_ID } from 'src/consts/const';
import { useSettingsTabState } from 'src/contexts/settings-tab-provider';
import { SettingItem } from 'src/react-components/settings/setting-item';
import { SettingsHeader } from 'src/react-components/settings/settings-header';

export function LLMSettings() {
  const { currentLLM } =useSettingsTabState();

  return (
    <>
      <SettingsHeader Icon={BrainIcon} title="LLM" />
      <SettingItem title='使用LLM'>
        <LLMSelect/>
      </SettingItem>

      {currentLLM === LLM_API_SERVICE_ID.openai && <OpenAISetting />}
      {currentLLM === LLM_API_SERVICE_ID.bedrock && <BedrockSetting />}
    </>
  );
}
