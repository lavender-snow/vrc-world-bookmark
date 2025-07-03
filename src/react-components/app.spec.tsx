import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import '@testing-library/jest-dom';
import { App } from './app';

jest.mock('classnames', () => (...args: any[]) => args.filter(Boolean).join(' '));

jest.mock('./recommend/recommend', () => ({
  Recommend: () => <div data-testid="recommend">Recommend</div>,
}));
jest.mock('./bookmark-list/bookmark-list', () => ({
  BookmarkList: () => <div data-testid="bookmark-list">BookmarkList</div>,
}));
jest.mock('./data-entry/world-data-entry', () => ({
  WorldDataEntry: () => <div data-testid="world-data-entry">WorldDataEntry</div>,
}));
jest.mock('./settings/settings', () => ({
  Settings: () => <div data-testid="settings">Settings</div>,
}));

jest.mock('src/contexts/app-data-provider', () => ({
  AppDataProvider: ({ children }: any) => <>{children}</>,
}));
jest.mock('src/contexts/recommend-provider', () => ({
  RecommendProvider: ({ children }: any) => <>{children}</>,
}));
jest.mock('src/contexts/bookmark-list-provider', () => ({
  BookmarkListProvider: ({ children }: any) => <>{children}</>,
}));
jest.mock('src/contexts/settings-tab-provider', () => ({
  SettingsTabProvider: ({ children }: any) => <>{children}</>,
}));

const addToast = jest.fn();
jest.mock('src/contexts/toast-provider', () => ({
  ToastProvider: ({ children }: any) => <>{children}</>,
  useToast: () => ({
    addToast,
  }),
}));

jest.mock('src/contexts/world-data-entry-provider', () => ({
  WorldDataEntryProvider: ({ children }: any) => <>{children}</>,
}));

describe('App', () => {
  it('初期表示で「おすすめ」タブがアクティブ', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /おすすめ/ })).toHaveClass('activeTab');
      // 他のタブの内容は表示されていない
      expect(screen.queryByTestId('bookmark-list')).not.toBeInTheDocument();
      expect(screen.queryByTestId('world-data-entry')).not.toBeInTheDocument();
      expect(screen.queryByTestId('settings')).not.toBeInTheDocument();
    });
  });

  it('「ワールド一覧」タブをクリックするとBookmarkListが表示される', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /ワールド一覧/ }));
    await waitFor(() => {
      expect(screen.getByTestId('bookmark-list')).toBeInTheDocument();
    });
  });

  it('「ワールド情報登録」タブをクリックするとWorldDataEntryが表示される', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /ワールド情報登録/ }));
    await waitFor(() => {
      expect(screen.getByTestId('world-data-entry')).toBeInTheDocument();
    });
  });

  it('「設定」タブをクリックするとSettingsが表示される', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /設定/ }));
    await waitFor(() => {
      expect(screen.getByTestId('settings')).toBeInTheDocument();
    });
  });

  it('タブのアイコンが各種表示される', async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByTestId('icon-register')).toBeInTheDocument();
      expect(screen.getByTestId('icon-list')).toBeInTheDocument();
      expect(screen.getByTestId('icon-settings')).toBeInTheDocument();
    });
  });
});
