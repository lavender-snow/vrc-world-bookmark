import { AnimatePresence, motion } from 'framer-motion';

import { GeneralSettings } from './general/general-settings';
import { LLMSettings } from './llm/llm-settings';
import { SettingsCategoryMenu } from './settings-category-menu';
import styles from './settings.scss';

import { SETTINGS_CATEGORY_ID } from 'src/consts/const';
import { useSettingsTabState } from 'src/contexts/settings-tab-provider';

export function Settings() {
  const { activeCategory } = useSettingsTabState();

  return (
    <AnimatePresence mode='wait'>
      <motion.div className={styles.settingsWrapper}
        key="settings"
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -40 }}
        transition={{ duration: 0.3 }}
      >
        <SettingsCategoryMenu activeCategory={activeCategory} />
        <div className={styles.settingsContent}>
          { activeCategory === SETTINGS_CATEGORY_ID.general && <GeneralSettings /> }
          { activeCategory === SETTINGS_CATEGORY_ID.llm && <LLMSettings /> }
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
