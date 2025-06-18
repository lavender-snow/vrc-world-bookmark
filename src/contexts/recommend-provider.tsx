import { createContext, useContext, useState } from 'react';

import { VRChatWorldInfo } from 'src/types/renderer';

type RecommendContextValue = {
  vrchatWorldInfo: VRChatWorldInfo | null;
  setVRChatWorldInfo: React.Dispatch<React.SetStateAction<VRChatWorldInfo | null>>;
};

const RecommendContext = createContext<RecommendContextValue | null>(null);

export function RecommendProvider({ children }: { children: React.ReactNode }) {
  const [vrchatWorldInfo, setVRChatWorldInfo] = useState<VRChatWorldInfo | null>(null);

  return (
    <RecommendContext.Provider value={{ vrchatWorldInfo, setVRChatWorldInfo }}>
      {children}
    </RecommendContext.Provider>
  );
}

export function useRecommendState() {
  const ctx = useContext(RecommendContext);
  if (!ctx) throw new Error('useRecommendState must be used within a RecommendProvider');
  return ctx;
}
