import { createContext, useContext, useEffect, useState } from 'react';

import { useToast } from './toast-provider';

import { BOOKMARK_LIST_INIT_MODE_ID, BookmarkListInitModeId, NoticeType, SETTINGS_CATEGORY_ID, SettingsCategoryId, WORLD_UPDATE_INFO_STATUS, WorldUpdateInfoStatusType } from 'src/consts/const';

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
  bookmarkListInitMode?: BookmarkListInitModeId;
  onChangeBookmarkListInitMode?: (newMode: BookmarkListInitModeId) => void;
};

const SettingsTabContext = createContext<SettingsTabContextValue>(undefined);

export function SettingsTabProvider({ children }: { children: React.ReactNode }) {
  const [activeCategory, setActiveCategory] = useState(SETTINGS_CATEGORY_ID.general);
  const [updateTargetTotal, setUpdateTargetTotal] = useState<number>(0);
  const [processedCount, setProcessedCount] = useState<number>(0);
  const [worldInfoIsUpdating, setWorldInfoIsUpdating] = useState<boolean>(false);
  const [worldInfoUpdateStatus, setWorldInfoUpdateStatus] = useState<WorldUpdateInfoStatusType>(WORLD_UPDATE_INFO_STATUS.idle);
  const [bookmarkListInitMode, setBookmarkListInitMode] = useState<BookmarkListInitModeId>(BOOKMARK_LIST_INIT_MODE_ID.default);
  const { addToast } = useToast();

  useEffect(() => {
    async function loadSettings() {
      const bookmarkListInitModeValue = await window.credentialStore.loadKey('bookmarkListInitMode');
      if (bookmarkListInitModeValue) {
        setBookmarkListInitMode(bookmarkListInitModeValue as BookmarkListInitModeId); // 値が取得できた場合にのみセット
      }
    }

    loadSettings();
  }, []);

  const onChangeBookmarkListInitMode = async (newMode: BookmarkListInitModeId) => {
    setBookmarkListInitMode(newMode);
    await window.credentialStore.saveKey('bookmarkListInitMode', newMode);

    addToast('ワールド一覧画面の初期表示モードを変更しました。', NoticeType.success);
  };

  return (
    <SettingsTabContext.Provider value={{
      activeCategory, setActiveCategory,
      updateTargetTotal, setUpdateTargetTotal,
      processedCount, setProcessedCount,
      worldInfoIsUpdating, setWorldInfoIsUpdating,
      worldInfoUpdateStatus, setWorldInfoUpdateStatus,
      bookmarkListInitMode, onChangeBookmarkListInitMode,
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
