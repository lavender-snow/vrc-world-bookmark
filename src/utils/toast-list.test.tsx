import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ToastList } from './toast-list';

import { NoticeType } from 'src/consts/const';

describe('ToastList', () => {
  it('複数のトーストが表示される', () => {
    const toasts = [
      { id: '1', message: 'A', noticeType: NoticeType.info },
      { id: '2', message: 'B', noticeType: NoticeType.error },
    ];
    render(<ToastList toasts={toasts} removeToast={() => {}} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('removeToastが呼ばれる', () => {
    const toasts = [{ id: '1', message: 'Bye', noticeType: NoticeType.info }];
    const removeToast = jest.fn();
    render(<ToastList toasts={toasts} removeToast={removeToast} />);
    screen.getByText('Bye').dispatchEvent(
      new AnimationEvent('animationend', { bubbles: true, animationName: 'fadeout' }),
    );
    expect(removeToast).toHaveBeenCalledWith('1');
  });
});
