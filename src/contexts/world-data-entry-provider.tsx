import { createContext, useContext, useState } from 'react';
import type { VRChatWorldInfo } from '../types/renderer';

type WorldDataEntryContextValue = {
  worldIdOrUrl: string;
  setWorldIdOrUrl: React.Dispatch<React.SetStateAction<string>>;
  vrchatWorldInfo: VRChatWorldInfo | null;
  setVRChatWorldInfo: React.Dispatch<React.SetStateAction<VRChatWorldInfo | null>>;
};

const WorldDataEntryContext = createContext<WorldDataEntryContextValue | null>(null);

export function WorldDataEntryProvider({ children }: { children: React.ReactNode }) {
  const [worldIdOrUrl, setWorldIdOrUrl] = useState<string>('');
  const [vrchatWorldInfo, setVRChatWorldInfo] = useState<VRChatWorldInfo | null>(null);

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
  return useContext(WorldDataEntryContext);
}
