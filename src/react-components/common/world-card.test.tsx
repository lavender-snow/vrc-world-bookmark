import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { WorldCard } from './world-card';

import { VRChatWorldInfo } from 'src/types/renderer';
import { writeClipboard } from 'src/utils/util';

jest.mock('src/contexts/app-data-provider', () => ({
  useAppData: () => ({
    genres: [
      { id: 0, name: 'Chill', name_jp: 'チル'},
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

const worldInfo: VRChatWorldInfo = {
  id: 'wrld_15fe33f1-937e-4e93-8a40-902fb9552a11',
  authorName: 'syuzen',
  capacity: 24,
  createdAt: '2020-06-07T17:12:08.318Z',
  description: 'Simple world with just a mirror and an event calendar․',
  favorites: 10,
  imageUrl: 'https://api.vrchat.cloud/api/1/file/file_c68c3996-25d5-4d81-afd3-6c30645391d2/5/file',
  name: 'VerySimpleWorld',
  releaseStatus: 'public',
  tags: ['system_approved'],
  thumbnailImageUrl: 'https://api.vrchat.cloud/api/1/image/file_c68c3996-25d5-4d81-afd3-6c30645391d2/5/256',
  updatedAt: '2021-05-26T05:37:15.578Z',
  visits: 6590,
  deletedAt: null,
  genreIds: [0],
  note: 'マイワールド',
  visitStatusId: 2,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('WorldCard', () => {
  it('ワールド名・作者・説明などが表示される', () => {
    render(<WorldCard worldInfo={worldInfo} />);
    expect(screen.getByText(worldInfo.name)).toBeInTheDocument();
    expect(screen.getByText(`by ${worldInfo.authorName}`)).toBeInTheDocument();
    expect(screen.getByText(worldInfo.description)).toBeInTheDocument();
    expect(screen.getByText(worldInfo.favorites)).toBeInTheDocument();
    expect(screen.getByText(worldInfo.visits.toLocaleString())).toBeInTheDocument();
    expect(screen.getByText(worldInfo.capacity)).toBeInTheDocument();
    expect(screen.getByText(new Date(worldInfo.createdAt).toLocaleDateString())).toBeInTheDocument();
    expect(screen.getByText(new Date(worldInfo.updatedAt).toLocaleDateString())).toBeInTheDocument();
    expect(screen.getByText(worldInfo.note)).toBeInTheDocument();
    expect(screen.getByLabelText('チル')).toBeInTheDocument();
    expect(screen.getByText('完了')).toBeInTheDocument();
  });

  it('ワールド名クリックでクリップボードにコピーされる', () => {
    render(<WorldCard worldInfo={worldInfo} />);
    const clipboardButton = screen.getByLabelText('ワールド名をコピー');
    fireEvent.click(clipboardButton);

    expect(writeClipboard).toHaveBeenCalledWith(worldInfo.name);
  });

  it('メモを編集してフォーカスを外すとAPIが呼ばれる', async () => {
    render(<WorldCard worldInfo={worldInfo} />);
    const textarea = screen.getByPlaceholderText('ワールドの補足情報を入力');
    fireEvent.change(textarea, { target: { value: '新しいメモ' } });
    fireEvent.blur(textarea);
    await waitFor(() => {
      expect(window.dbAPI.updateWorldBookmark).toHaveBeenCalledWith(
        expect.objectContaining({ note: '新しいメモ' }),
      );
    });
  });

  it('ジャンルチェックボックスをクリックするとAPIが呼ばれる', async () => {
    render(<WorldCard worldInfo={worldInfo} />);
    const genreCheckbox = screen.getByLabelText('高品質');
    fireEvent.click(genreCheckbox);
    await waitFor(() => {
      expect(window.dbAPI.updateWorldGenres).toHaveBeenCalledWith(
        expect.objectContaining({ genreIds: [0, 1] }),
      );
    });
  });

  it('訪問状況を変更するとAPIが呼ばれる', async () => {
    render(<WorldCard worldInfo={worldInfo} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '1' } });
    await waitFor(() => {
      expect(window.dbAPI.updateWorldBookmark).toHaveBeenCalledWith(
        expect.objectContaining({ visitStatusId: 1 }),
      );
    });
  });

  it('タグが表示される', () => {
    render(<WorldCard worldInfo={worldInfo} />);
    expect(screen.getByText('["system_approved"]')).toBeInTheDocument();
  });
});
