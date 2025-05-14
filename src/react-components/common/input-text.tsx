import classNames from "classnames";
import styles from "./input-text.scss";

export function InputText({
  onChange,
  placeholder,
  className = '',
}: {
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type="text"
      onChange={onChange}
      placeholder={placeholder}
      className={classNames([styles.inputText , className])}
    />
  );
}
