import { LlmApiKeySetting } from './llm-api-key-setting';
import { SettingItem } from './setting-item';
import { SettingsHeader } from './settings-header';

export function LLMSettings() {
  return (
    <>
      <SettingsHeader title="LLM" />
      <SettingItem
        title='対話検索利用設定'
      >
        <LlmApiKeySetting />
      </SettingItem>
    </>
  );
}
