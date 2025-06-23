import { useEffect, useState } from 'react';

import styles from './llm-api-key-setting.scss';

import { Button } from 'commonComponents/button';
import { DropDownList } from 'commonComponents/drop-down-list';
import { InputText } from 'commonComponents/input-text';
import { LLM_API_SERVICES, NoticeType } from 'src/consts/const';
import { useSettingsTabState } from 'src/contexts/settings-tab-provider';
import { useToast } from 'src/contexts/toast-provider';

export function LlmApiKeySetting() {
  const [service, setService] = useState<'openai' | 'bedrock'>('openai');
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const { addToast } = useToast();
  const { apiKey, setApiKey } = useSettingsTabState();

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedService = e.target.value as 'openai' | 'bedrock';

    setService(selectedService);
    window.credentialStore.saveKey('selectedService', selectedService);
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
  };

  const handleSave = () => {
    window.credentialStore.saveKey(`${service}ApiKey`, apiKey);
    addToast('APIキーを保存しました', NoticeType.success);
  };

  const handleReset = () => {
    setApiKey('');
    setApiKeySaved(false);
    window.credentialStore.saveKey(`${service}ApiKey`, '');
    addToast('APIキーの登録をリセットしました', NoticeType.info);
  };

  useEffect(() => {
    window.credentialStore.loadKey('selectedService').then((savedService) => {
      if (savedService) {
        setService(savedService as 'openai' | 'bedrock');
        window.credentialStore.isKeySaved(`${savedService}ApiKey`).then((exist) => {
          setApiKeySaved(exist);
        });
      }
    });
  }, [service]);

  console.log(service);

  return (
    <>
      <span>
        対話検索を使用するための設定します。<br />
        OpenAIもしくはAmazon BedrockのAPIキーを入力してください。
      </span>
      <div className={styles.llmApiSetting}>
        <div className={styles.settingItem}>
          <h3>サービス選択</h3>
          <DropDownList
            options={LLM_API_SERVICES.map(
              (service) => ({ id: service.id, name: service.value }),
            )}
            currentValue={service}
            onChange={(e) => handleServiceChange(e)}
          />
        </div>
        <div className={styles.settingItem}>
          <h3>APIキー設定</h3>

          <div className={styles.apiKeyInput}>
            {apiKeySaved ? (
              <>
                <InputText
                  value={service === 'openai' ? 'sk-********************************' : '**********'}
                  onChange={handleApiKeyChange}
                  placeholder={`${service === 'openai' ? 'OpenAI' : 'Bedrock'}のAPIキーを入力`}
                  type="text"
                  disabled={true}
                />
                <Button onClick={handleReset} className={styles.apiKeyInputButton}>再設定</Button>
              </>
            ) : (
              <>
                <InputText
                  value={apiKey}
                  onChange={handleApiKeyChange}
                  placeholder={`${service === 'openai' ? 'OpenAI' : 'Bedrock'}のAPIキーを入力`}
                  type="password"
                />
                <Button
                  onClick={handleSave}
                  disabled={!apiKey}
                  className={styles.apiKeyInputButton}
                >
                  保存
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
