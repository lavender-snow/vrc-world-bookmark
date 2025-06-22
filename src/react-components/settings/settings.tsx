import { AnimatePresence, motion } from 'framer-motion';

import styles from './settings.scss';
import { WorldUpdateProgress } from './world-update-progress';

function SettingItem({
  title, children,
} : {
  title: string, children: React.ReactNode
}) {
  return (
    <div>
      <h2>{title}</h2>
      <div className={styles.settingItemContent}>
        {children}
      </div>
    </div>
  );
}

export function Settings() {
  return (
    <AnimatePresence mode='wait'>
      <motion.div className={styles.settings}
        key="settings"
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.3 }}
      >
        <h1>設定</h1>

        <SettingItem
          title="ワールドデータ更新"
        >
          <span>
            24時間以上前に取得したワールドデータを対象に最新情報へ更新します。VRChatサーバーへの負荷軽減のため1件ごとに1秒待機します。
          </span>
          <WorldUpdateProgress />
        </SettingItem>
      </motion.div>
    </AnimatePresence>
  );
}
