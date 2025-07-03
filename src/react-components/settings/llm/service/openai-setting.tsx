import { useState } from 'react';

import styles from './openai-setting.scss';

import { Button } from 'commonComponents/button';
import { InputText } from 'commonComponents/input-text';
import { NoticeType } from 'src/consts/const';
import { useAppData } from 'src/contexts/app-data-provider';
import { useToast } from 'src/contexts/toast-provider';
import { SettingItem } from 'src/react-components/settings/setting-item';

export function OpenAISetting() {
  const { llmEnabled, setLLMEnabled } = useAppData();
  const [apiKey, setApiKey] = useState('');
  const { addToast } = useToast();

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
  };

  const handleSave = () => {
    setLLMEnabled(true);
    window.credentialStore.saveKey('openaiApiKey', apiKey);
    addToast('APIキーを保存しました', NoticeType.success);
  };

  const handleReset = () => {
    setApiKey('');
    setLLMEnabled(false);
    window.credentialStore.saveKey('openaiApiKey', '');
    addToast('APIキーの登録をリセットしました', NoticeType.info);
  };

  return (
    <SettingItem title='OpenAI利用設定'>
      <div className={styles.llmSettingWrapper}>
        <h4>APIキー設定</h4>

        <div className={styles.apiKeyInputWrapper}>
          {llmEnabled ? (
            <>
              <InputText
                value={'sk-********************************'}
                onChange={() => {}}
                type="text"
                disabled={true}
                className={styles.apiKeyInput}
              />
              <Button onClick={handleReset} className={styles.apiKeyInputButton}>再設定</Button>
            </>
          ) : (
            <>
              <InputText
                value={apiKey}
                onChange={handleApiKeyChange}
                placeholder={'OpenAIのAPIキーを入力'}
                type="password"
                className={styles.apiKeyInput}
              />
              <Button onClick={handleSave} className={styles.apiKeyInputButton} disabled={!apiKey}>保存</Button>
            </>
          )}
        </div>
      </div>
    </SettingItem>
  );
}
