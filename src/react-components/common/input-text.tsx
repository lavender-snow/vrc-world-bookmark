import classNames from 'classnames';

import styles from './input-text.scss';

export function InputText({
  value,
  onChange,
  placeholder,
  className = '',
  onKeyDown,
  onBlur,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
}) {
  return (
    <input
      value={value}
      type="text"
      onChange={onChange}
      onKeyDown={(e) => onKeyDown && onKeyDown(e)}
      onBlur={onBlur}
      placeholder={placeholder}
      className={classNames([styles.inputText, className])}
    />
  );
}
