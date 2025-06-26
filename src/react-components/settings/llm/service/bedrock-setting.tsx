import { useEffect, useState } from 'react';

import styles from './bedrock-setting.scss';

import { Button } from 'commonComponents/button';
import { InputText } from 'commonComponents/input-text';
import { AWS_REGION_ID, AWS_REGIONS, AwsRegionId } from 'src/consts/aws';
import { NoticeType } from 'src/consts/const';
import { useToast } from 'src/contexts/toast-provider';
import { DropDownList } from 'src/react-components/common/drop-down-list';
import { SettingItem } from 'src/react-components/settings/setting-item';

interface BedrockCredentials {
  accessKey: string;
  secretAccessKey: string;
  region: AwsRegionId;
}

const defaultCredentials: BedrockCredentials = {
  accessKey: '',
  secretAccessKey: '',
  region: AWS_REGION_ID.apNortheast1, // 東京リージョンをデフォルトに設定
};

export function BedrockSetting() {
  const [credentialsSaved, setCredentialsSaved] = useState(false);
  const [credentials, setCredentials] = useState<BedrockCredentials>(defaultCredentials);
  const { addToast } = useToast();

  const handleAccessKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials(prev => ({
      ...prev,
      accessKey: e.target.value,
    }));
  };

  const handleSecretKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCredentials(prev => ({
      ...prev,
      secretAccessKey: e.target.value,
    }));
  };

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCredentials(prev => ({
      ...prev,
      region: e.target.value as AwsRegionId,
    }));
  };

  const handleSave = () => {
    setCredentialsSaved(true);
    window.credentialStore.saveKey('bedrockCredentials', JSON.stringify(credentials));
    addToast('認証情報を保存しました', NoticeType.success);
  };

  const handleReset = () => {
    setCredentials(defaultCredentials);
    setCredentialsSaved(false);
    window.credentialStore.saveKey('bedrockCredentials', '');
    addToast('認証情報の登録をリセットしました', NoticeType.info);
  };

  useEffect(() => {
    window.credentialStore.isKeySaved('bedrockCredentials').then((exist) => {
      setCredentialsSaved(exist);
    });
  }, []);

  return (
    <SettingItem title='Amazon Bedrock利用設定'>
      <div className={styles.llmSettingWrapper}>

        <div>
          <h4>アクセスキー設定</h4>
          <div className={styles.accessKeyInputWrapper}>
            {credentialsSaved ? (
              <>
                <InputText
                  value={'********************************'}
                  onChange={() => {}}
                  type="text"
                  disabled={true}
                  className={styles.accessKeyInput}
                />
              </>
            ) : (
              <>
                <InputText
                  value={credentials.accessKey}
                  onChange={handleAccessKeyChange}
                  placeholder={'AWSアクセスキーを入力'}
                  type="password"
                  className={styles.accessKeyInput}
                />
              </>
            )}
          </div>
        </div>

        <div>
          <h4>シークレットキー設定</h4>
          <div className={styles.accessKeyInputWrapper}>
            {credentialsSaved ? (
              <>
                <InputText
                  value={'********************************'}
                  onChange={() => {}}
                  type="text"
                  disabled={true}
                  className={styles.accessKeyInput}
                />
              </>
            ) : (
              <>
                <InputText
                  value={credentials.secretAccessKey}
                  onChange={handleSecretKeyChange}
                  placeholder={'AWSシークレットキーを入力'}
                  type="password"
                  className={styles.accessKeyInput}
                />
              </>
            )}
          </div>
        </div>

        <div>
          <h4>リージョン設定</h4>
          <div className={styles.apiKeyInputWrapper}>
            {credentialsSaved ? (
              <DropDownList
                options={[{ id: '', name: '-' }]}
                currentValue={'-'}
                disabled={true}
                className={styles.regionSelect}
              />
            ) : (
              <DropDownList
                options={AWS_REGIONS.map(region => ({ id: region.id, name: `${region.name} (${region.id})`}))}
                currentValue={credentials.region}
                onChange={handleRegionChange}
              />
            )}
          </div>
        </div>

        <div>
          {credentialsSaved ? (
            <Button onClick={handleReset} className={styles.apiKeyInputButton}>再設定</Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={!credentials.accessKey || !credentials.secretAccessKey}
              className={styles.apiKeyInputButton}
            >
              保存
            </Button>
          )}
        </div>
      </div>
    </SettingItem>
  );
}
