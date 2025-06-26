
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { GeneralSettings } from './general-settings';

jest.mock('./world-update-progress', () => ({
  WorldUpdateProgress: () => <div data-testid="mock-world-update-progress">Mock WorldUpdateProgress</div>,
}));

describe('GeneralSettings', () => {
  it('一般設定が正しくレンダリングされる', () => {
    render(<GeneralSettings />);

    // タイトルが表示されることを確認
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('一般');

    // ワールドデータ更新セクションが表示されることを確認
    expect(screen.getByText('ワールドデータ更新')).toBeInTheDocument();
    expect(screen.getByTestId('mock-world-update-progress')).toBeInTheDocument();
  });
});
