import classNames from 'classnames';
import { useState } from 'react';

import styles from './app.scss';
import { BookmarkList } from './bookmark-list';
import { WorldDataEntry } from './world-data-entry';

import { AppDataProvider } from 'src/contexts/app-data-provider';
import { BookmarkListProvider } from 'src/contexts/bookmark-list-provider';
import { ToastProvider } from 'src/contexts/toast-provider';
import { WorldDataEntryProvider } from 'src/contexts/world-data-entry-provider';

const TAB_KEYS = {
  register: 'register',
  list: 'list',
};

const TABS = [
  {
    key: TAB_KEYS.list,
    label: 'ワールド一覧',
  },
  {
    key: TAB_KEYS.register,
    label: 'ワールド情報登録',
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
            {tab.label}
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
          </ToastProvider>
        </AppDataProvider>
      </div>
    </>
  );
}
