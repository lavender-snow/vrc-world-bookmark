import classNames from 'classnames';

import styles from './button.scss';

export function Button({
  onClick,
  children,
  className = '',
  disabled = false,
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type='button'
      className={classNames([styles.button, className])}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
