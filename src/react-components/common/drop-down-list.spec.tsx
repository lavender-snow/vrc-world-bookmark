import { render, screen, fireEvent } from '@testing-library/react';

import '@testing-library/jest-dom';
import { DropDownList, SelectOption } from './drop-down-list';

const options: SelectOption[] = [
  { id: '1', name: 'Option1' },
  { id: '2', name: 'Option2' },
];

describe('DropDownList', () => {
  it('全てのオプションが表示される', () => {
    render(<DropDownList options={options} currentValue="" />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Option1')).toBeInTheDocument();
    expect(screen.getByText('Option2')).toBeInTheDocument();
  });

  it('currentValueが設定されている', () => {
    render(<DropDownList options={options} currentValue="1" />);
    expect(screen.getByRole('combobox')).toHaveValue('1');
  });

  it('onChangeが呼ばれる', () => {
    const handleChange = jest.fn();
    render(
      <DropDownList options={options} currentValue="" onChange={handleChange} />,
    );
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });
    expect(handleChange).toHaveBeenCalled();
  });
});
