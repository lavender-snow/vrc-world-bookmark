import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

import { Accordion } from './accordion';

const MockIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg data-testid="mock-icon" {...props} />
);

describe('Accordion', () => {
  it('タイトルとアイコンが表示される', () => {
    render(
      <Accordion icon={MockIcon} title="Test Title">
        <div>Content</div>
      </Accordion>,
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByTestId('mock-icon')).toBeInTheDocument();
  });

  it('デフォルトで閉じている場合、内容が表示されない', () => {
    render(
      <Accordion icon={MockIcon} title="Test Title">
        <div>Content</div>
      </Accordion>,
    );
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('defaultOpen=trueで内容が表示される', () => {
    render(
      <Accordion icon={MockIcon} title="Test Title" defaultOpen>
        <div>Content</div>
      </Accordion>,
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('タイトルクリックで開閉できる', () => {
    render(
      <Accordion icon={MockIcon} title="Test Title">
        <div>Content</div>
      </Accordion>,
    );
    const title = screen.getByText(/Test Title/);
    fireEvent.click(title);
    expect(screen.getByText('Content')).toBeInTheDocument();
    fireEvent.click(title);
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('onToggleが呼ばれる', () => {
    const onToggle = jest.fn();
    render(
      <Accordion icon={MockIcon} title="Test Title" onToggle={onToggle}>
        <div>Content</div>
      </Accordion>,
    );
    const title = screen.getByText(/Test Title/);
    fireEvent.click(title);
    expect(onToggle).toHaveBeenCalledWith(true);
    fireEvent.click(title);
    expect(onToggle).toHaveBeenCalledWith(false);
  });
});
