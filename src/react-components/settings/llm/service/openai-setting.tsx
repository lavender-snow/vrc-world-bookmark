import { useEffect, useState } from 'react';

import styles from './openai-setting.scss';

import { Button } from 'commonComponents/button';
import { InputText } from 'commonComponents/input-text';
import { NoticeType } from 'src/consts/const';
import { useToast } from 'src/contexts/toast-provider';
import { SettingItem } from 'src/react-components/settings/setting-item';

export function OpenAISetting() {
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const { addToast } = useToast();

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
  };

  const handleSave = () => {
    setApiKeySaved(true);
    window.credentialStore.saveKey('openaiApiKey', apiKey);
    addToast('APIキーを保存しました', NoticeType.success);
  };

  const handleReset = () => {
    setApiKey('');
    setApiKeySaved(false);
    window.credentialStore.saveKey('openaiApiKey', '');
    addToast('APIキーの登録をリセットしました', NoticeType.info);
  };

  useEffect(() => {
    window.credentialStore.isKeySaved('openaiApiKey').then((exist) => {
      setApiKeySaved(exist);
    });
  }, []);

  return (
    <SettingItem title='OpenAI利用設定'>
      <div className={styles.llmSettingWrapper}>
        <h4>APIキー設定</h4>

        <div className={styles.apiKeyInputWrapper}>
          {apiKeySaved ? (
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
