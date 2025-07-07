import { createContext, useContext, useState, useEffect } from 'react';

import { LLM_API_SERVICE_ID, llmApiService } from 'src/consts/const';
import { VRChatWorldInfo } from 'src/types/renderer';
import type { Genre, VisitStatus } from 'src/types/table';

type AppData = {
  genres?: Genre[];
  visitStatuses?: VisitStatus[];
  currentLLM?: llmApiService;
  setCurrentLLM?: React.Dispatch<React.SetStateAction<llmApiService>>;
  llmEnabled?: boolean;
  setLLMEnabled?: React.Dispatch<React.SetStateAction<boolean>>;
  lastUpdatedWorldInfo?: VRChatWorldInfo | null;
  setLastUpdatedWorldInfo?: React.Dispatch<React.SetStateAction<VRChatWorldInfo | null>>;
};

const AppDataContext = createContext<AppData>({});

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [visitStatuses, setVisitStatuses] = useState<VisitStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLLM, setCurrentLLM] = useState<llmApiService>(LLM_API_SERVICE_ID.openai);
  const [llmEnabled, setLLMEnabled] = useState(false);
  const [lastUpdatedWorldInfo, setLastUpdatedWorldInfo] = useState<VRChatWorldInfo | null>(null);

  useEffect(() => {
    async function fetchAppData() {
      const [genres, visitStatuses] = await Promise.all([
        window.dbAPI.getGenres(),
        window.dbAPI.getVisitStatuses(),
      ]);
      setGenres(genres);
      setVisitStatuses(visitStatuses);

      const service = await window.credentialStore.loadKey('currentLLM');
      setCurrentLLM(service as llmApiService);

      let enabled = false;
      if (service === LLM_API_SERVICE_ID.openai) {
        enabled = await window.credentialStore.isKeySaved('openaiApiKey');
      } else if (service === LLM_API_SERVICE_ID.bedrock) {
        enabled = await window.credentialStore.isKeySaved('bedrockCredentials');
      }
      setLLMEnabled(enabled);
      setLoading(false);
    }

    fetchAppData();
  }, []);

  useEffect(() => {
    async function checkLlmEnabled() {
      let enabled = false;
      if (currentLLM === LLM_API_SERVICE_ID.openai) {
        enabled = await window.credentialStore.isKeySaved('openaiApiKey');
      } else if (currentLLM === LLM_API_SERVICE_ID.bedrock) {
        enabled = await window.credentialStore.isKeySaved('bedrockCredentials');
      }
      setLLMEnabled(enabled);
    }
    checkLlmEnabled();
  }, [currentLLM]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AppDataContext.Provider value={{ genres, visitStatuses, currentLLM, setCurrentLLM, llmEnabled, setLLMEnabled, lastUpdatedWorldInfo, setLastUpdatedWorldInfo }}>
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  return useContext(AppDataContext);
}
