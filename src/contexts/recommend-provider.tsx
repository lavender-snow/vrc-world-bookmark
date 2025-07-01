import { createContext, useContext, useEffect, useState } from 'react';

import { useToast } from './toast-provider';

import { NoticeType, RECOMMEND_TYPE, RecommendType } from 'src/consts/const';
import { VRChatWorldInfo } from 'src/types/renderer';

type RecommendContextValue = {
  vrchatWorldInfo: VRChatWorldInfo | null;
  getRecommendWorld: () => Promise<void>;
  getLLMRecommendWorld: () => Promise<void>;
  recommendType: RecommendType;
  setRecommendType: React.Dispatch<React.SetStateAction<RecommendType>>;
  requestMessage: string;
  setRequestMessage: React.Dispatch<React.SetStateAction<string>>;
};

const RecommendContext = createContext<RecommendContextValue | null>(null);

export function RecommendProvider({ children }: { children: React.ReactNode }) {
  const [vrchatWorldInfo, setVRChatWorldInfo] = useState<VRChatWorldInfo | null>(null);
  const [recommendType, setRecommendType] = useState<RecommendType>(RECOMMEND_TYPE[0].id);
  const [requestMessage, setRequestMessage] = useState<string>('');
  const { addToast } = useToast();

  async function getRecommendWorld() {
    try {
      const response = await window.dbAPI.getRandomRecommendedWorld();

      if (!response) {
        setVRChatWorldInfo(null);
        addToast('おすすめワールドが見つかりませんでした。', NoticeType.info);
      } else {
        setVRChatWorldInfo(response);
        addToast('おすすめワールドを取得しました。', NoticeType.success);
      }
    } catch (error) {
      setVRChatWorldInfo(null);
      addToast(`ワールド情報の取得に失敗しました。エラー: ${error}`, NoticeType.error);
      console.error('おすすめワールド取得に失敗しました:', error);
    }
  }

  async function getLLMRecommendWorld() {
    try {
      const response = await window.dbAPI.getLLMRecommendWorld(requestMessage);

      if (response.error) {
        addToast(`ワールド情報の取得に失敗しました。エラー: ${response.error}`, NoticeType.error);
      } else if (response.data) {
        setVRChatWorldInfo(response.data.VRChatWorldInfo);
        addToast(`おすすめワールドを取得しました。選定理由: ${response.data.reason}`, NoticeType.success);
      }
    } catch (error) {
      setVRChatWorldInfo(null);
      addToast(`ワールド情報の取得に失敗しました。エラー: ${error}`, NoticeType.error);
      console.error('LLMおすすめワールド取得に失敗しました:', error);
    }
  }

  useEffect(() => {
    window.dbAPI.getRandomRecommendedWorld().then((worldInfo) => {
      setVRChatWorldInfo(worldInfo);
    });
  }, []);

  return (
    <RecommendContext.Provider value={{ vrchatWorldInfo, getRecommendWorld, getLLMRecommendWorld, recommendType, setRecommendType, requestMessage, setRequestMessage }}>
      {children}
    </RecommendContext.Provider>
  );
}

export function useRecommendState() {
  const ctx = useContext(RecommendContext);
  if (!ctx) throw new Error('useRecommendState must be used within a RecommendProvider');
  return ctx;
}
