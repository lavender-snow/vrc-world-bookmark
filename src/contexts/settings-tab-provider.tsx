import { createContext, useContext, useEffect, useState } from 'react';

import { LLM_API_SERVICE_ID, llmApiService, LLMApiServiceId, SETTINGS_CATEGORY_ID, SettingsCategoryId, WORLD_UPDATE_INFO_STATUS, WorldUpdateInfoStatusType } from 'src/consts/const';

type SettingsTabContextValue = {
  activeCategory: SettingsCategoryId;
  setActiveCategory: React.Dispatch<React.SetStateAction<SettingsCategoryId>>;
  updateTargetTotal : number;
  setUpdateTargetTotal: React.Dispatch<React.SetStateAction<number>>;
  processedCount: number;
  setProcessedCount: React.Dispatch<React.SetStateAction<number>>;
  worldInfoIsUpdating: boolean;
  setWorldInfoIsUpdating: React.Dispatch<React.SetStateAction<boolean>>;
  worldInfoUpdateStatus: WorldUpdateInfoStatusType;
  setWorldInfoUpdateStatus: React.Dispatch<React.SetStateAction<WorldUpdateInfoStatusType>>;
  currentLLM: LLMApiServiceId,
  setCurrentLLM: React.Dispatch<React.SetStateAction<LLMApiServiceId>>;
  apiKey: string,
  setApiKey: React.Dispatch<React.SetStateAction<string>>;
};

const SettingsTabContext = createContext<SettingsTabContextValue | null>(null);

export function SettingsTabProvider({ children }: { children: React.ReactNode }) {
  const [activeCategory, setActiveCategory] = useState(SETTINGS_CATEGORY_ID.general);
  const [updateTargetTotal, setUpdateTargetTotal] = useState<number>(0);
  const [processedCount, setProcessedCount] = useState<number>(0);
  const [worldInfoIsUpdating, setWorldInfoIsUpdating] = useState<boolean>(false);
  const [worldInfoUpdateStatus, setWorldInfoUpdateStatus] = useState<WorldUpdateInfoStatusType>(WORLD_UPDATE_INFO_STATUS.idle);
  const [currentLLM, setCurrentLLM] = useState<llmApiService>(LLM_API_SERVICE_ID.openai);
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.credentialStore.loadKey('currentLLM').then(service => setCurrentLLM(service as llmApiService));
    setLoading(false);
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <SettingsTabContext.Provider value={{
      activeCategory, setActiveCategory,
      updateTargetTotal, setUpdateTargetTotal,
      processedCount, setProcessedCount,
      worldInfoIsUpdating, setWorldInfoIsUpdating,
      worldInfoUpdateStatus, setWorldInfoUpdateStatus,
      currentLLM, setCurrentLLM,
      apiKey, setApiKey,
    }}>
      {children}
    </SettingsTabContext.Provider>
  );
}

export function useSettingsTabState() {
  const ctx = useContext(SettingsTabContext);
  if (!ctx) throw new Error('useSettingsTabState must be used within a SettingsTabProvider');
  return ctx;
}
