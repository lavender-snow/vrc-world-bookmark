import { createContext, useContext, useEffect, useState } from 'react';

import { useAppData } from './app-data-provider';

import type { VRChatWorldInfo } from 'src/types/renderer';

type WorldDataEntryContextValue = {
  worldIdOrUrl?: string;
  setWorldIdOrUrl?: React.Dispatch<React.SetStateAction<string>>;
  vrchatWorldInfo?: VRChatWorldInfo | null;
  setVRChatWorldInfo?: React.Dispatch<React.SetStateAction<VRChatWorldInfo | null>>;
};

const WorldDataEntryContext = createContext<WorldDataEntryContextValue>(undefined);

export function WorldDataEntryProvider({ children }: { children: React.ReactNode }) {
  const [worldIdOrUrl, setWorldIdOrUrl] = useState<string>('');
  const [vrchatWorldInfo, setVRChatWorldInfo] = useState<VRChatWorldInfo | null>(null);
  const { lastUpdatedWorldInfo } = useAppData();

  useEffect(() => {
    if (
      lastUpdatedWorldInfo &&
      lastUpdatedWorldInfo.id === vrchatWorldInfo?.id &&
      JSON.stringify(lastUpdatedWorldInfo) !== JSON.stringify(vrchatWorldInfo)
    ) {
      setVRChatWorldInfo(lastUpdatedWorldInfo);
    }
  }, [lastUpdatedWorldInfo]);

  return (
    <WorldDataEntryContext.Provider value={{
      worldIdOrUrl, setWorldIdOrUrl,
      vrchatWorldInfo, setVRChatWorldInfo,
    }}>
      {children}
    </WorldDataEntryContext.Provider>
  );
}

export function useWorldDataEntryState() {
  const ctx = useContext(WorldDataEntryContext);
  if (!ctx) throw new Error('useWorldDataEntryState must be used within a WorldDataEntryProvider');
  return ctx;
}
