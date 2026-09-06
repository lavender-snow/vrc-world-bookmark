import { render, screen, fireEvent } from '@testing-library/react';

import '@testing-library/jest-dom';
import { SettingsCategoryMenu } from './settings-category-menu';

import { SETTINGS_CATEGORY } from 'src/consts/const';

const setActiveCategory = jest.fn();
jest.mock('src/contexts/settings-tab-provider', () => ({
  useSettingsTabState: () => ({
    setActiveCategory,
  }),
}));

describe('SettingsCategoryMenu', () => {
  beforeEach(() => {
    setActiveCategory.mockClear();
  });

  it('全てのカテゴリがレンダリングされることをテスト', () => {
    render(<SettingsCategoryMenu activeCategory={SETTINGS_CATEGORY[0].id} />);
    SETTINGS_CATEGORY.forEach(category => {
      expect(screen.getByText(category.value)).toBeInTheDocument();
    });
  });

  it('アクティブカテゴリの場合activeCategoryItemクラスが設定されることをテスト', () => {
    render(<SettingsCategoryMenu activeCategory={SETTINGS_CATEGORY[1].id} />);
    const active = screen.getByText(SETTINGS_CATEGORY[1].value);
    expect(active).toHaveClass('activeCategoryItem');
  });

  it('非アクティブのカテゴリーがクリックされた時にsetActiveCategoryが実行されることをテスト', () => {
    render(<SettingsCategoryMenu activeCategory={SETTINGS_CATEGORY[0].id} />);
    const nonActive = screen.getByText(SETTINGS_CATEGORY[1].value);
    fireEvent.click(nonActive);
    expect(setActiveCategory).toHaveBeenCalledWith(SETTINGS_CATEGORY[1].id);
  });

  it('アクティブのカテゴリーがクリックされた時にsetActiveCategoryが実行されないことをテスト', () => {
    render(<SettingsCategoryMenu activeCategory={SETTINGS_CATEGORY[0].id} />);
    const active = screen.getByText(SETTINGS_CATEGORY[0].value);
    fireEvent.click(active);
    expect(setActiveCategory).not.toHaveBeenCalled();
  });
});
