import classNames from "classnames";
import styles from "./button.scss";

export function Button({
  onClick,
  children,
  className = '',
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={classNames([styles.button , className])}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
