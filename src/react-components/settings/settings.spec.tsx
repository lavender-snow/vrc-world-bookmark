import { fireEvent, render, screen } from '@testing-library/react';

import '@testing-library/jest-dom';
import { Settings } from './settings';

import { SettingsTabProvider } from 'src/contexts/settings-tab-provider';

beforeAll(() => {
  global.window.credentialStore = {
    loadKey: jest.fn().mockResolvedValue(''),
    saveKey: jest.fn().mockResolvedValue(undefined),
    isKeySaved: jest.fn().mockResolvedValue(false),
  };
});

const addToast = jest.fn();
jest.mock('src/contexts/toast-provider', () => ({
  ToastProvider: ({ children }: any) => <>{children}</>,
  useToast: () => ({
    addToast,
  }),
}));

describe('Settings', () => {
  it('VRChatカテゴリからログイン画面を開ける', async () => {
    window.vrchatAuth = {
      getAuthState: jest.fn().mockResolvedValue({ status: 'signedOut', persistence: 'none' }),
      restoreSession: jest.fn(), login: jest.fn(), verifyTwoFactor: jest.fn(), logout: jest.fn(),
    };
    render(<SettingsTabProvider><Settings /></SettingsTabProvider>);
    fireEvent.click(screen.getByText('VRChat'));
    expect(await screen.findByLabelText('ユーザー名')).toBeInTheDocument();
  });
  it('設定画面が正しくレンダリングされる', () => {
    render(
      <SettingsTabProvider>
        <Settings />
      </SettingsTabProvider>,
    );

    // タイトルが表示されることを確認
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('設定');
  });
});
