import { render, screen, fireEvent } from '@testing-library/react';

import '@testing-library/jest-dom';
import { InputText } from './input-text';

describe('InputText', () => {
  it('valueとplaceholderが表示される', () => {
    render(<InputText value="テスト" onChange={() => {}} placeholder="入力してください" />);
    const input = screen.getByPlaceholderText('入力してください') as HTMLInputElement;
    expect(input.value).toBe('テスト');
  });

  it('onChangeが呼ばれる', () => {
    const handleChange = jest.fn();
    render(<InputText value="" onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('onKeyDownが呼ばれる', () => {
    const handleKeyDown = jest.fn();
    render(<InputText value="" onChange={() => {}} onKeyDown={handleKeyDown} />);
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(handleKeyDown).toHaveBeenCalled();
  });

  it('onBlurが呼ばれる', () => {
    const handleBlur = jest.fn();
    render(<InputText value="" onChange={() => {}} onBlur={handleBlur} />);
    const input = screen.getByRole('textbox');
    fireEvent.blur(input);
    expect(handleBlur).toHaveBeenCalled();
  });

  it('classNameが反映される', () => {
    render(<InputText value="" onChange={() => {}} className="custom-class" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-class');
  });
});
