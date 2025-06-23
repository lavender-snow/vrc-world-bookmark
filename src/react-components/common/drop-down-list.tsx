import classNames from 'classnames';

import styles from './drop-down-list.scss';

export interface SelectOption {
  id: string;
  name: string;
}

export function DropDownList({ options, currentValue, onChange, disabled = false, className }: {
  options: SelectOption[],
  currentValue: string,
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
  disabled?: boolean;
  className?: string;
}) {
  return (
    <select
      value={currentValue}
      className={classNames(styles.dropDownList, className)}
      onChange={(e) => {
        if (onChange) {
          onChange(e);
        }
      }}
      disabled={disabled}
    >
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </select>
  );
}
