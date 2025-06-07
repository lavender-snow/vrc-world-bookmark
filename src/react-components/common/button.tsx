import classNames from "classnames";
import styles from "./button.scss";

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
    <div
      className={classNames([styles.button, className, disabled && styles.disabled])}
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled}
    >
      {children}
    </div>
  );
}
