import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { WorldCard } from './world-card';

import { mockWorldInfo } from '__mocks__/test-data';
import { writeClipboard } from 'src/utils/util';

jest.mock('src/contexts/app-data-provider', () => ({
  useAppData: () => ({
    genres: [
      { id: 0, name: 'Chill', name_jp: 'チル' },
      { id: 1, name: 'HighQuality', name_jp: '高品質' },
      { id: 2, name: 'Game', name_jp: 'ゲーム' },
      { id: 3, name: 'Horror', name_jp: 'ホラー' },
      { id: 4, name: 'PhotoSpot', name_jp: '撮影' },
    ],
    visitStatuses: [
      { id: 0, name: 'Unvisited', name_jp: '未訪問' },
      { id: 1, name: 'InProgress', name_jp: '進行中' },
      { id: 2, name: 'Completed', name_jp: '完了' },
      { id: 3, name: 'Hidden', name_jp: '非表示' },
    ],
    setLastUpdatedWorldInfo: jest.fn(),
  }),
}));
jest.mock('src/contexts/toast-provider', () => ({
  useToast: () => ({
    addToast: jest.fn(),
  }),
}));
jest.mock('src/utils/util', () => ({
  debounce: (fn: (...args: unknown[]) => unknown) => fn,
  writeClipboard: jest.fn(),
}));
jest.mock('./world-tags', () => ({
  WorldTags: ({ tags }: { tags: string[] }) => (
    <div data-testid="mock-world-tags">{JSON.stringify(tags)}</div>
  ),
}));

const mockSetVRChatWorldInfo = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('WorldCard', () => {
  it('ワールド名・作者・説明などが表示される', () => {
    render(<WorldCard worldInfo={mockWorldInfo} setVRChatWorldInfo={mockSetVRChatWorldInfo} />);
    expect(screen.getByText(mockWorldInfo.name)).toBeInTheDocument();
    expect(screen.getByText(`by ${mockWorldInfo.authorName}`)).toBeInTheDocument();
    expect(screen.getByText(mockWorldInfo.description)).toBeInTheDocument();
    expect(screen.getByText(mockWorldInfo.favorites)).toBeInTheDocument();
    expect(screen.getByText(mockWorldInfo.visits.toLocaleString())).toBeInTheDocument();
    expect(screen.getByText(mockWorldInfo.capacity)).toBeInTheDocument();
    expect(screen.getByText(new Date(mockWorldInfo.createdAt).toLocaleDateString())).toBeInTheDocument();
    expect(screen.getByText(new Date(mockWorldInfo.updatedAt).toLocaleDateString())).toBeInTheDocument();
    expect(screen.getByText(mockWorldInfo.note)).toBeInTheDocument();
    expect(screen.getByLabelText('チル')).toBeInTheDocument();
    expect(screen.getByText('完了')).toBeInTheDocument();
  });

  it('ワールド名クリックでクリップボードにコピーされる', () => {
    render(<WorldCard worldInfo={mockWorldInfo} setVRChatWorldInfo={mockSetVRChatWorldInfo} />);
    const clipboardButton = screen.getByLabelText('ワールド名をコピー');
    fireEvent.click(clipboardButton);

    expect(writeClipboard).toHaveBeenCalledWith(mockWorldInfo.name);
  });

  it('メモを編集してフォーカスを外すとAPIが呼ばれる', async () => {
    render(<WorldCard worldInfo={mockWorldInfo} setVRChatWorldInfo={mockSetVRChatWorldInfo} />);
    const textarea = screen.getByPlaceholderText('ワールドの補足情報を入力');
    window.dbAPI.updateWorldBookmark = jest.fn().mockResolvedValue(true);
    fireEvent.change(textarea, { target: { value: '新しいメモ' } });
    fireEvent.blur(textarea);
    await waitFor(() => {
      expect(window.dbAPI.updateWorldBookmark).toHaveBeenCalledWith(
        expect.objectContaining({ note: '新しいメモ' }),
      );
      expect(mockSetVRChatWorldInfo).toHaveBeenCalledWith(
        expect.objectContaining({ note: '新しいメモ' }),
      );
    });
  });

  it('ジャンルチェックボックスをクリックするとAPIが呼ばれる', async () => {
    render(<WorldCard worldInfo={mockWorldInfo} setVRChatWorldInfo={mockSetVRChatWorldInfo} />);
    const genreCheckbox = screen.getByLabelText('高品質');
    window.dbAPI.updateWorldGenres = jest.fn().mockResolvedValue(true);
    fireEvent.click(genreCheckbox);
    await waitFor(() => {
      expect(window.dbAPI.updateWorldGenres).toHaveBeenCalledWith(
        expect.objectContaining({ genreIds: [0, 1] }),
      );
      expect(mockSetVRChatWorldInfo).toHaveBeenCalledWith(
        expect.objectContaining({ genreIds: [0, 1] }),
      );
    });
  });

  it('訪問状況を変更するとAPIが呼ばれる', async () => {
    render(<WorldCard worldInfo={mockWorldInfo} setVRChatWorldInfo={mockSetVRChatWorldInfo} />);
    const select = screen.getByRole('combobox');
    window.dbAPI.updateWorldBookmark = jest.fn().mockResolvedValue(true);
    fireEvent.change(select, { target: { value: '1' } });
    await waitFor(() => {
      expect(window.dbAPI.updateWorldBookmark).toHaveBeenCalledWith(
        expect.objectContaining({ visitStatusId: 1 }),
      );
      expect(mockSetVRChatWorldInfo).toHaveBeenCalledWith(
        expect.objectContaining({ visitStatusId: 1 }),
      );
    });
  });

  it('タグが表示される', () => {
    render(<WorldCard worldInfo={mockWorldInfo} setVRChatWorldInfo={mockSetVRChatWorldInfo} />);
    expect(screen.getByText('["system_approved"]')).toBeInTheDocument();
  });
});
