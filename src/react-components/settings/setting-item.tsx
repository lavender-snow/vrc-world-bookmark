import styles from './setting-item.scss';

export function SettingItem({
  title, children,
} : {
  title: string, children: React.ReactNode
}) {
  return (
    <div className={styles.settingItem}>
      <h3>{title}</h3>
      <div className={styles.settingItemContent}>
        {children}
      </div>
    </div>
  );
}
