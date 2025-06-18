import classNames from 'classnames';
import { useState } from 'react';

import styles from './app.scss';
import { BookmarkList } from './bookmark-list/bookmark-list';
import { WorldDataEntry } from './data-entry/world-data-entry';
import { Settings } from './settings/settings';

import { ReactComponent as BookmarkIcon } from 'assets/images/MaterialSymbolsBookmarkAddOutline.svg';
import { ReactComponent as SettingsIcon } from 'assets/images/MaterialSymbolsSettingsRounded.svg';
import { ReactComponent as EarthIcon } from 'assets/images/MdiEarth.svg';
import { AppDataProvider } from 'src/contexts/app-data-provider';
import { BookmarkListProvider } from 'src/contexts/bookmark-list-provider';
import { SettingsTabProvider } from 'src/contexts/settings-tab-provider';
import { ToastProvider } from 'src/contexts/toast-provider';
import { WorldDataEntryProvider } from 'src/contexts/world-data-entry-provider';

const TAB_KEYS = {
  register: 'register',
  list: 'list',
  settings: 'settings',
};

const TABS = [
  {
    key: TAB_KEYS.list,
    label: 'ワールド一覧',
    icon: EarthIcon,
  },
  {
    key: TAB_KEYS.register,
    label: 'ワールド情報登録',
    icon: BookmarkIcon,
  },
  {
    key: TAB_KEYS.settings,
    label: '設定',
    icon: SettingsIcon,
  },
];

type TabKey = typeof TAB_KEYS[keyof typeof TAB_KEYS];

export function App(): React.ReactNode {
  const [activeTab, setActiveTab] = useState<TabKey>(TABS[0].key);

  return (
    <>
      <div className={styles.tabHeader}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            className={classNames(styles.tabHeaderItem, activeTab === tab.key && styles.activeTab)}
            onClick={() => setActiveTab(tab.key)}
          >
            <tab.icon data-testid={`icon-${tab.key}`} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.tabContent}>
        <AppDataProvider>
          <ToastProvider>
            <BookmarkListProvider>
              {activeTab === TAB_KEYS.list && <BookmarkList />}
            </BookmarkListProvider>
            <WorldDataEntryProvider>
              {activeTab === TAB_KEYS.register && <WorldDataEntry />}
            </WorldDataEntryProvider>
            <SettingsTabProvider>
              {activeTab === TAB_KEYS.settings && <Settings />}
            </SettingsTabProvider>
          </ToastProvider>
        </AppDataProvider>
      </div>
    </>
  );
}
