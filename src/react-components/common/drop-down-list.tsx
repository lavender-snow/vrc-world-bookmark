import styles from './drop-down-list.scss';

export interface SelectOption {
  id: string;
  name: string;
}

export function DropDownList({ options, currentValue, onChange }: {
  options: SelectOption[],
  currentValue: string,
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
}) {
  return (
    <select
      value={currentValue}
      className={styles.dropDownList}
      onChange={(e) => {
        if (onChange) {
          onChange(e);
        }
      }}
    >
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </select>
  );
}
