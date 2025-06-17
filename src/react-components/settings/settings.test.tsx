import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { Settings } from './settings';

jest.mock('./world-update-progress', () => ({
  WorldUpdateProgress: () => <div data-testid="mock-world-update-progress">Mock WorldUpdateProgress</div>,
}));

describe('Settings', () => {
  it('設定画面が正しくレンダリングされる', () => {
    render(<Settings />);

    // タイトルが表示されることを確認
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('設定');

    // ワールドデータ更新セクションが表示されることを確認
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('ワールドデータ更新');
    expect(screen.getByText(/24時間以上前に取得したワールドデータを対象に最新情報へ更新します。/)).toBeInTheDocument();

    // WorldUpdateProgressコンポーネントが正しくレンダリングされることを確認
    expect(screen.getByTestId('mock-world-update-progress')).toBeInTheDocument();
  });
});
