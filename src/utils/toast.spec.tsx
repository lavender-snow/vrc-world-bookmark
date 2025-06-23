import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { Toast } from './toast';

import { NoticeType } from 'src/consts/const';

describe('Toast', () => {
  it('Infoメッセージが表示される', () => {
    render(<Toast message="Hello" onClose={() => {}} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByTestId('icon-info')).toBeInTheDocument();
  });

  it('Successメッセージが表示される', () => {
    render(<Toast message="Test" onClose={() => {}} noticeType={NoticeType.success} />);
    expect(screen.getByTestId('icon-success')).toBeInTheDocument();
  });

  it('Errorメッセージが表示される', () => {
    render(<Toast message="Test" onClose={() => {}} noticeType={NoticeType.error} />);
    expect(screen.getByTestId('icon-error')).toBeInTheDocument();
  });

  it('Warningメッセージが表示される', () => {
    render(<Toast message="Test" onClose={() => {}} noticeType={NoticeType.warning} />);
    expect(screen.getByTestId('icon-warning')).toBeInTheDocument();
  });

  it('messageが空なら何も表示しない', () => {
    const { container } = render(<Toast message="" onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('アニメーション終了時にonCloseが呼ばれる', () => {
    const onClose = jest.fn();
    render(<Toast message="Bye" onClose={onClose} />);

    screen.getByText('Bye').dispatchEvent(
      new AnimationEvent('animationend', { bubbles: true, animationName: 'fadeout' }),
    );
    expect(onClose).toHaveBeenCalled();
  });
});
