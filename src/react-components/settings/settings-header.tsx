import styles from './settings-header.scss';

export function SettingsHeader({ Icon, title }: { Icon: React.FC<React.SVGProps<SVGSVGElement>>, title: string }) {
  return (
    <div className={styles.settingsHeader}>
      <Icon />
      <h2>{title}</h2>
    </div>
  );
}
