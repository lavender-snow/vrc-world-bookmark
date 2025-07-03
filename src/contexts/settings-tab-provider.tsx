import { createContext, useContext, useState } from 'react';

import { SETTINGS_CATEGORY_ID, SettingsCategoryId, WORLD_UPDATE_INFO_STATUS, WorldUpdateInfoStatusType } from 'src/consts/const';

type SettingsTabContextValue = {
  activeCategory?: SettingsCategoryId;
  setActiveCategory?: React.Dispatch<React.SetStateAction<SettingsCategoryId>>;
  updateTargetTotal? : number;
  setUpdateTargetTotal?: React.Dispatch<React.SetStateAction<number>>;
  processedCount?: number;
  setProcessedCount?: React.Dispatch<React.SetStateAction<number>>;
  worldInfoIsUpdating?: boolean;
  setWorldInfoIsUpdating?: React.Dispatch<React.SetStateAction<boolean>>;
  worldInfoUpdateStatus?: WorldUpdateInfoStatusType;
  setWorldInfoUpdateStatus?: React.Dispatch<React.SetStateAction<WorldUpdateInfoStatusType>>;
};

const SettingsTabContext = createContext<SettingsTabContextValue>({});

export function SettingsTabProvider({ children }: { children: React.ReactNode }) {
  const [activeCategory, setActiveCategory] = useState(SETTINGS_CATEGORY_ID.general);
  const [updateTargetTotal, setUpdateTargetTotal] = useState<number>(0);
  const [processedCount, setProcessedCount] = useState<number>(0);
  const [worldInfoIsUpdating, setWorldInfoIsUpdating] = useState<boolean>(false);
  const [worldInfoUpdateStatus, setWorldInfoUpdateStatus] = useState<WorldUpdateInfoStatusType>(WORLD_UPDATE_INFO_STATUS.idle);

  return (
    <SettingsTabContext.Provider value={{
      activeCategory, setActiveCategory,
      updateTargetTotal, setUpdateTargetTotal,
      processedCount, setProcessedCount,
      worldInfoIsUpdating, setWorldInfoIsUpdating,
      worldInfoUpdateStatus, setWorldInfoUpdateStatus,
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
