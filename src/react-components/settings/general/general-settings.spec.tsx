
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { GeneralSettings } from './general-settings';

import { SettingsTabProvider } from 'src/contexts/settings-tab-provider';

beforeAll(() => {
  global.window.credentialStore = {
    loadKey: jest.fn().mockResolvedValue(''),
    saveKey: jest.fn().mockResolvedValue(undefined),
    isKeySaved: jest.fn().mockResolvedValue(false),
  };
});

jest.mock('./world-update-progress', () => ({
  WorldUpdateProgress: () => <div data-testid="mock-world-update-progress">Mock WorldUpdateProgress</div>,
}));

const addToast = jest.fn();
jest.mock('src/contexts/toast-provider', () => ({
  ToastProvider: ({ children }: any) => <>{children}</>,
  useToast: () => ({
    addToast,
  }),
}));

describe('GeneralSettings', () => {
  it('一般設定が正しくレンダリングされる', () => {
    render(<SettingsTabProvider><GeneralSettings /></SettingsTabProvider>);

    // タイトルが表示されることを確認
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('一般');

    // ワールドデータ更新セクションが表示されることを確認
    expect(screen.getByText('ワールドデータ更新')).toBeInTheDocument();
    expect(screen.getByTestId('mock-world-update-progress')).toBeInTheDocument();
  });
});
