import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { Settings } from './settings';

beforeAll(() => {
  global.window.credentialStore = {
    loadKey: jest.fn().mockResolvedValue(''),
    saveKey: jest.fn().mockResolvedValue(undefined),
    isKeySaved: jest.fn().mockResolvedValue(false),
  };
});

jest.mock('src/contexts/settings-tab-provider', () => ({
  useSettingsTabState: () => ({
    activeCategory: 'general',
    setActiveCategory: jest.fn(),
    updateTargetTotal: 0,
    setUpdateTargetTotal: jest.fn(),
    processedCount: 0,
    setProcessedCount: jest.fn(),
    worldInfoIsUpdating: false,
    setWorldInfoIsUpdating: jest.fn(),
    worldInfoUpdateStatus: 'idle',
    setWorldInfoUpdateStatus: jest.fn(),
  }),
}));

describe('Settings', () => {
  it('設定画面が正しくレンダリングされる', () => {
    render(<Settings />);

    // タイトルが表示されることを確認
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('設定');
  });
});
