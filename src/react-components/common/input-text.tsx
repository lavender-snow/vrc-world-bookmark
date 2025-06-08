import classNames from 'classnames';
import styles from './input-text.scss';

export function InputText({
  value,
  onChange,
  placeholder,
  className = '',
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      value={value}
      type="text"
      onChange={onChange}
      placeholder={placeholder}
      className={classNames([styles.inputText, className])}
    />
  );
}
