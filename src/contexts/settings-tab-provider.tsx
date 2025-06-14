import { createContext, useContext, useState } from 'react';

import { WORLD_UPDATE_INFO_STATUS, WorldUpdateInfoStatusType } from 'src/consts/const';

type SettingsTabContextValue = {
  updateTargetTotal : number;
  setUpdateTargetTotal: React.Dispatch<React.SetStateAction<number>>;
  processedCount: number;
  setProcessedCount: React.Dispatch<React.SetStateAction<number>>;
  worldInfoIsUpdating: boolean;
  setWorldInfoIsUpdating: React.Dispatch<React.SetStateAction<boolean>>;
  worldInfoUpdateStatus: WorldUpdateInfoStatusType;
  setWorldInfoUpdateStatus: React.Dispatch<React.SetStateAction<WorldUpdateInfoStatusType>>;
};

const SettingsTabContext = createContext<SettingsTabContextValue | null>(null);

export function SettingsTabProvider({ children }: { children: React.ReactNode }) {
  const [updateTargetTotal, setUpdateTargetTotal] = useState<number>(0);
  const [processedCount, setProcessedCount] = useState<number>(0);
  const [worldInfoIsUpdating, setWorldInfoIsUpdating] = useState<boolean>(false);
  const [worldInfoUpdateStatus, setWorldInfoUpdateStatus] = useState<WorldUpdateInfoStatusType>(WORLD_UPDATE_INFO_STATUS.idle);

  return (
    <SettingsTabContext.Provider value={{
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
