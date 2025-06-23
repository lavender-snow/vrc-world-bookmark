import { render, screen, fireEvent } from '@testing-library/react';

import '@testing-library/jest-dom';
import { CheckboxGroup } from './checkbox-group';

import { MasterTable } from 'src/types/table';

const options: MasterTable[] = [
  { id: 1, name_jp: 'オプション1', name: 'Option1' },
  { id: 2, name_jp: 'オプション2', name: 'Option2' },
];

describe('CheckboxGroup', () => {
  it('全てのオプションが表示される', () => {
    render(
      <CheckboxGroup
        options={options}
        selected={[]}
        onChange={() => {}}
        allOption={false}
      />,
    );
    expect(screen.getByLabelText('オプション1')).toBeInTheDocument();
    expect(screen.getByLabelText('オプション2')).toBeInTheDocument();
  });

  it('allOptionがtrueのとき「すべて」チェックボックスが表示される', () => {
    render(
      <CheckboxGroup
        options={options}
        selected={[]}
        onChange={() => {}}
        allOption={true}
      />,
    );
    expect(screen.getByLabelText('すべて')).toBeInTheDocument();
  });

  it('selectedに含まれるオプションがチェックされている', () => {
    render(
      <CheckboxGroup
        options={options}
        selected={[1]}
        onChange={() => {}}
        allOption={false}
      />,
    );
    expect(screen.getByLabelText('オプション1')).toBeChecked();
    expect(screen.getByLabelText('オプション2')).not.toBeChecked();
  });

  it('オプションをクリックするとonChangeが呼ばれる', () => {
    const handleChange = jest.fn();
    render(
      <CheckboxGroup
        options={options}
        selected={[]}
        onChange={handleChange}
        allOption={false}
      />,
    );
    fireEvent.click(screen.getByLabelText('オプション1'));
    expect(handleChange).toHaveBeenCalledWith([1]);
  });

  it('チェック済みオプションをクリックするとonChangeで外れる', () => {
    const handleChange = jest.fn();
    render(
      <CheckboxGroup
        options={options}
        selected={[1]}
        onChange={handleChange}
        allOption={false}
      />,
    );
    fireEvent.click(screen.getByLabelText('オプション1'));
    expect(handleChange).toHaveBeenCalledWith([]);
  });

  it('allOptionのチェックボックスをクリックするとonChange([])が呼ばれる', () => {
    const handleChange = jest.fn();
    render(
      <CheckboxGroup
        options={options}
        selected={[1, 2]}
        onChange={handleChange}
        allOption={true}
      />,
    );
    fireEvent.click(screen.getByLabelText('すべて'));
    expect(handleChange).toHaveBeenCalledWith([]);
  });

  it('allLabelをカスタマイズできる', () => {
    render(
      <CheckboxGroup
        options={options}
        selected={[]}
        onChange={() => {}}
        allOption={true}
        allLabel="全部"
      />,
    );
    expect(screen.getByLabelText('全部')).toBeInTheDocument();
  });
});
