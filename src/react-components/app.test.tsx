import { render, screen, fireEvent } from '@testing-library/react';

import '@testing-library/jest-dom';
import { App } from './app';

jest.mock('classnames', () => (...args: any[]) => args.filter(Boolean).join(' '));

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
jest.mock('src/contexts/bookmark-list-provider', () => ({
  BookmarkListProvider: ({ children }: any) => <>{children}</>,
}));
jest.mock('src/contexts/settings-tab-provider', () => ({
  SettingsTabProvider: ({ children }: any) => <>{children}</>,
}));
jest.mock('src/contexts/toast-provider', () => ({
  ToastProvider: ({ children }: any) => <>{children}</>,
}));
jest.mock('src/contexts/world-data-entry-provider', () => ({
  WorldDataEntryProvider: ({ children }: any) => <>{children}</>,
}));

describe('App', () => {
  it('初期表示で「ワールド一覧」タブがアクティブ', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /ワールド一覧/ })).toHaveClass('activeTab');
    // 他のタブの内容は表示されていない
    expect(screen.queryByTestId('world-data-entry')).not.toBeInTheDocument();
    expect(screen.queryByTestId('settings')).not.toBeInTheDocument();
  });

  it('「ワールド一覧」タブをクリックするとBookmarkListが表示される', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /ワールド一覧/ }));
    expect(screen.getByTestId('bookmark-list')).toBeInTheDocument();
  });

  it('「ワールド情報登録」タブをクリックするとWorldDataEntryが表示される', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /ワールド情報登録/ }));
    expect(screen.getByTestId('world-data-entry')).toBeInTheDocument();
  });

  it('「設定」タブをクリックするとSettingsが表示される', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /設定/ }));
    expect(screen.getByTestId('settings')).toBeInTheDocument();
  });

  it('タブのアイコンが各種表示される', () => {
    render(<App />);
    expect(screen.getByTestId('icon-register')).toBeInTheDocument();
    expect(screen.getByTestId('icon-list')).toBeInTheDocument();
    expect(screen.getByTestId('icon-settings')).toBeInTheDocument();
  });
});
