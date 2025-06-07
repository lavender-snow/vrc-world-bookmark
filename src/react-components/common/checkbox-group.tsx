import type { MasterTable } from "../../types/table";

export function CheckboxGroup({ options, selected, onChange, allOption, allLabel = "すべて" }: {
  options: MasterTable[],
  selected: (string | number)[],
  onChange: (selected: (string | number)[]) => void,
  allOption: boolean,
  allLabel?: string
}) {
  const handleToggle = (id: string | number) => {
    if (selected.includes(id)) {
      onChange(selected.filter(v => v !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div>
      {allOption && (
        <label>
          <input
            type="checkbox"
            checked={selected.length === 0}
            onChange={() => onChange([])}
          />
          {allLabel}
        </label>
      )}
      {options.map(option => (
        <label key={option.id}>
          <input
            type="checkbox"
            checked={selected.includes(option.id)}
            onChange={() => handleToggle(option.id)}
          />
          {option.name_jp}
        </label>
      ))}
    </div>
  );
}
