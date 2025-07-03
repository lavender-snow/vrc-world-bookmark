import styles from './llm-select.scss';

import { DropDownList } from 'commonComponents/drop-down-list';
import { LLM_API_SERVICES, LLMApiServiceId, NoticeType } from 'src/consts/const';
import { useAppData } from 'src/contexts/app-data-provider';
import { useToast } from 'src/contexts/toast-provider';

export function LLMSelect() {
  const { currentLLM, setCurrentLLM } = useAppData();
  const { addToast } = useToast();

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLLM = e.target.value as LLMApiServiceId;

    setCurrentLLM(selectedLLM);
    window.credentialStore.saveKey('currentLLM', selectedLLM);
    addToast('使用するLLMを設定しました', NoticeType.success);
  };

  return (
    <>
      <span>
        対話検索に使用するLLMを選択します。
      </span>
      <div className={styles.llmApiSetting}>
        <div className={styles.settingItem}>
          <DropDownList
            options={LLM_API_SERVICES.map(
              (service) => ({ id: service.id, name: service.value }),
            )}
            currentValue={currentLLM}
            onChange={(e) => handleServiceChange(e)}
          />
        </div>
      </div>
    </>
  );
}
