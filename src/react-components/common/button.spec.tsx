import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { Button } from './button';

describe('Button', () => {
  const handleClick = jest.fn();

  it('ラベルが表示される', () => {
    render(<Button onClick={handleClick}>クリック</Button>);
    expect(screen.getByText('クリック')).toBeInTheDocument();
  });

  it('クリック時にonClickが呼ばれる', () => {
    render(<Button onClick={handleClick}>押す</Button>);
    fireEvent.click(screen.getByText('押す'));
    expect(handleClick).toHaveBeenCalled();
  });

  it('classNameが反映される', () => {
    render(<Button onClick={handleClick} className="custom-class">ラベル</Button>);
    const btn = screen.getByText('ラベル');
    expect(btn).toHaveClass('custom-class');
  });

  it('disabled時はクリックできない', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick} disabled>押せない</Button>);
    const btn = screen.getByText('押せない');
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
