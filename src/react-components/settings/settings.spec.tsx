import { render, screen } from '@testing-library/react';

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
