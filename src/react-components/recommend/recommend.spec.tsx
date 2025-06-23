import { render, screen, fireEvent } from '@testing-library/react';

import '@testing-library/jest-dom';

import { Recommend } from './recommend';

import { mockWorldInfo } from '__mocks__/test-data';
import { useRecommendState } from 'src/contexts/recommend-provider';
jest.mock('commonComponents/button', () => ({
  Button: (props: any) => <button {...props}>{props.children}</button>,
}));
jest.mock('commonComponents/input-text', () => ({
  InputText: (props: any) => (
    <input
      value={props.value}
      onChange={props.onChange}
      placeholder={props.placeholder}
      data-testid="input-text"
    />
  ),
}));
jest.mock('commonComponents/world-card', () => ({
  WorldCard: (props: any) => <div data-testid="mock-world-card">{JSON.stringify(props.worldInfo)}</div>,
}));
jest.mock('src/consts/const', () => ({
  RECOMMEND_TYPE: [
    { id: 'random', label: 'ランダム検索', description: 'お気に入り数、総訪問数、更新日などを加味しつつランダムに未訪問ワールドを取得します。' },
    { id: 'conversation', label: '対話検索', description: 'LLMを活用し、対話形式でおすすめワールドを検索します。API利用コストが発生します。' },
  ],
}));

jest.mock('src/contexts/recommend-provider', () => {
  const state = {
    vrchatWorldInfo: {},
    getRecommendWorld: jest.fn(),
    recommendType: 'random',
    setRecommendType: jest.fn(),
  };
  return {
    useRecommendState: () => state,
  };
});

describe('Recommend', () => {
  beforeEach(() => {
    const state = useRecommendState();
    Object.assign(state, {
      vrchatWorldInfo: {},
      getRecommendWorld: jest.fn(),
      recommendType: 'random',
      setRecommendType: jest.fn(),
    });
    jest.clearAllMocks();
  });

  it('ラジオボタンとボタンが表示される', () => {
    render(<Recommend />);
    expect(screen.getByRole('radio', { name: 'ランダム検索' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '対話検索' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ワールド取得' })).toBeInTheDocument();
  });

  it('選択中のラジオボタンがcheckedになる', () => {
    const state = useRecommendState();
    state.recommendType = 'conversation';
    render(<Recommend />);
    expect(screen.getByRole('radio', { name: '対話検索' })).toBeChecked();
  });

  // TODO:対話検索を選ぶとsetRecommendTypeが呼ばれ、InputTextが表示される

  it('ボタン押下でgetRecommendWorldが呼ばれる', () => {
    const state = useRecommendState();
    render(<Recommend />);
    fireEvent.click(screen.getByRole('button', { name: 'ワールド取得' }));
    expect(state.getRecommendWorld).toHaveBeenCalled();
  });

  it('vrchatWorldInfoがあるとWorldCardが表示される', () => {
    const state = useRecommendState();
    state.vrchatWorldInfo = mockWorldInfo;
    render(<Recommend />);
    expect(screen.getByTestId('mock-world-card').textContent).toContain(mockWorldInfo.name);
  });

  // TODO:対話検索へ切り替え後に説明文が変わっていることを確認する
  it('選択中のパターンの説明が表示される', () => {
    render(<Recommend />);
    expect(screen.getByText('お気に入り数、総訪問数、更新日などを加味しつつランダムに未訪問ワールドを取得します。')).toBeInTheDocument();
  });
});
