import styles from './settings-header.scss';

export function SettingsHeader({ title }: { title: string }) {
  return (
    <div className={styles.settingsHeader}>
      <h2>{title}</h2>
    </div>
  );
}
