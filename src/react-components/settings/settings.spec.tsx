import { render, screen } from '@testing-library/react';

import '@testing-library/jest-dom';
import { Settings } from './settings';

import { SETTINGS_CATEGORY_ID } from 'src/consts/const';
import { useSettingsTabState } from 'src/contexts/settings-tab-provider';

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

jest.mock('./general/general-settings', () => ({
  GeneralSettings: () => <div data-testid="general-settings">GeneralSettings</div>,
}));

jest.mock('./llm/llm-settings', () => ({
  LLMSettings: () => <div data-testid="llm-settings">LLMSettings</div>,
}));

jest.mock('src/contexts/settings-tab-provider', () => ({
  useSettingsTabState: jest.fn(),
}));

describe('Settings', () => {
  it('ActiveCategoryがgeneralの場合に一般設定画面がレンダリングされる', () => {
    (useSettingsTabState as jest.Mock).mockReturnValue({
      activeCategory: SETTINGS_CATEGORY_ID.general,
    });

    render(<Settings />);
    expect(screen.getByTestId('general-settings')).toBeInTheDocument();
    expect(screen.queryByTestId('llm-settings')).not.toBeInTheDocument();
  });

  it('ActiveCategoryがllmの場合にLLM設定画面がレンダリングされる', () => {
    (useSettingsTabState as jest.Mock).mockReturnValue({
      activeCategory: SETTINGS_CATEGORY_ID.llm,
    });
    render(<Settings />);
    expect(screen.getByTestId('llm-settings')).toBeInTheDocument();
    expect(screen.queryByTestId('general-settings')).not.toBeInTheDocument();
  });

  it('ActiveCategoryがgeneral, llm以外の場合に何もレンダリングされない', () => {
    (useSettingsTabState as jest.Mock).mockReturnValue({
      activeCategory: 'unknown-category',
    });
    render(<Settings />);
    expect(screen.queryByTestId('general-settings')).not.toBeInTheDocument();
    expect(screen.queryByTestId('llm-settings')).not.toBeInTheDocument();
  });
});
