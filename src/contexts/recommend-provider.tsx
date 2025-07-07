import { createContext, useContext, useEffect, useState } from 'react';

import { useToast } from './toast-provider';

import { NoticeType, RECOMMEND_TYPE, RecommendType } from 'src/consts/const';
import { VRChatWorldInfo } from 'src/types/renderer';

type RecommendContextValue = {
  vrchatWorldInfo?: VRChatWorldInfo | null;
  setVRChatWorldInfo?: React.Dispatch<React.SetStateAction<VRChatWorldInfo | null>>;
  getRecommendWorld?: () => Promise<void>;
  getLLMRecommendWorld?: () => Promise<void>;
  recommendType?: RecommendType;
  setRecommendType?: React.Dispatch<React.SetStateAction<RecommendType>>;
  requestMessage?: string;
  setRequestMessage?: React.Dispatch<React.SetStateAction<string>>;
  loading?: boolean;
  reason?: string | null;
};

const RecommendContext = createContext<RecommendContextValue>(undefined);

export function RecommendProvider({ children }: { children: React.ReactNode }) {
  const [vrchatWorldInfo, setVRChatWorldInfo] = useState<VRChatWorldInfo | null>(null);
  const [recommendType, setRecommendType] = useState<RecommendType>(RECOMMEND_TYPE[0].id);
  const [requestMessage, setRequestMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [reason, setReason] = useState<string | null>(null);
  const { addToast } = useToast();

  async function getRecommendWorld() {
    try {
      setLoading(true);
      const response = await window.dbAPI.getRandomRecommendedWorld();

      if (response.error) {
        setVRChatWorldInfo(null);
        addToast(response.error, NoticeType.info);
      } else {
        setVRChatWorldInfo(response.data.VRChatWorldInfo);
        setReason(response.data.reason || null);
        addToast('おすすめワールドを取得しました。', NoticeType.success);
      }
    } catch (error) {
      setVRChatWorldInfo(null);
      addToast(`ワールド情報の取得に失敗しました。エラー: ${error}`, NoticeType.error);
      console.error('おすすめワールド取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  }

  async function getLLMRecommendWorld() {
    try {
      setLoading(true);
      const response = await window.dbAPI.getLLMRecommendWorld(requestMessage);

      if (response.error) {
        addToast(`ワールド情報の取得に失敗しました。エラー: ${response.error}`, NoticeType.error);
      } else if (response.data) {
        setVRChatWorldInfo(response.data.VRChatWorldInfo);
        addToast('おすすめワールドを取得しました。', NoticeType.success);
        setReason(response.data.reason || null);
      }
    } catch (error) {
      setVRChatWorldInfo(null);
      addToast(`ワールド情報の取得に失敗しました。エラー: ${error}`, NoticeType.error);
      console.error('LLMおすすめワールド取得に失敗しました:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    window.dbAPI.getRandomRecommendedWorld().then((result) => {
      if (result.error) {
        console.error(`おすすめワールドの取得に失敗しました: ${result.error}`, NoticeType.error);
      } else {
        setVRChatWorldInfo(result.data.VRChatWorldInfo);
        setReason(result.data.reason || null);
      }
    });
  }, []);

  return (
    <RecommendContext.Provider value={{ vrchatWorldInfo, setVRChatWorldInfo, getRecommendWorld, getLLMRecommendWorld, recommendType, setRecommendType, requestMessage, setRequestMessage, loading, reason }}>
      {children}
    </RecommendContext.Provider>
  );
}

export function useRecommendState() {
  const ctx = useContext(RecommendContext);
  if (!ctx) throw new Error('useRecommendState must be used within a RecommendProvider');
  return ctx;
}
