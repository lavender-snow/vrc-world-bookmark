import styles from './settings-category-menu.scss';

import { SETTINGS_CATEGORY } from 'src/consts/const';
import { useSettingsTabState } from 'src/contexts/settings-tab-provider';

export function SettingsCategoryMenu({activeCategory}: { activeCategory: string }) {
  const { setActiveCategory } = useSettingsTabState();

  return (
    <div className={styles.settingsCategoryMenu}>
      <h1>設定</h1>
      <div className={styles.categoryList}>
        {SETTINGS_CATEGORY.map(category => (
          category.id === activeCategory ? (
            <div key={category.id} className={styles.activeCategoryItem}>
              {category.value}
            </div>
          ) : (
            <div onClick={() => setActiveCategory(category.id)} key={category.id} className={styles.categoryItem}>
              {category.value}
            </div>
          )
        ))}
      </div>
    </div>
  );
}
