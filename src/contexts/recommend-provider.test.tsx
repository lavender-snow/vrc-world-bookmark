import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { RecommendProvider, useRecommendState } from './recommend-provider';

import { mockWorldInfo } from '__mocks__/test-data';

const addToast = jest.fn();
jest.mock('./toast-provider', () => ({
  useToast: () => ({ addToast }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  window.dbAPI = {
    getRandomRecommendedWorld: jest.fn().mockResolvedValue(mockWorldInfo),
  } as any;
});

function ConsumerComponent() {
  const { vrchatWorldInfo, getRecommendWorld, recommendType, setRecommendType } = useRecommendState();
  return (
    <div>
      <span data-testid="world">{vrchatWorldInfo ? vrchatWorldInfo.name : 'none'}</span>
      <button
        onClick={() => getRecommendWorld()}
        data-testid="get-world-button"
      >
        getRecommendWorld
      </button>
      <span data-testid="type">{recommendType}</span>
      <button onClick={() => setRecommendType('conversation')} data-testid="set-type-button">
        setRecommendType
      </button>
    </div>
  );
}

describe('RecommendProvider', () => {
  it('初期値はnull、useEffect後に値がセットされる', async () => {
    render(
      <RecommendProvider>
        <ConsumerComponent />
      </RecommendProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('world')).toHaveTextContent(mockWorldInfo.name);
    });
  });

  it('getRecommendWorldで値が更新され、トーストが呼ばれる', async () => {
    render(
      <RecommendProvider>
        <ConsumerComponent />
      </RecommendProvider>,
    );
    fireEvent.click(screen.getByTestId('get-world-button'));
    await waitFor(() => {
      expect(window.dbAPI.getRandomRecommendedWorld).toHaveBeenCalled();
      expect(screen.getByTestId('world')).toHaveTextContent(mockWorldInfo.name);
      expect(addToast).toHaveBeenCalledWith('おすすめワールドを取得しました。', expect.anything());
    });
  });

  it('setRecommendTypeでrecommendTypeが変わる', async () => {
    render(
      <RecommendProvider>
        <ConsumerComponent />
      </RecommendProvider>,
    );
    expect(screen.getByTestId('type')).toHaveTextContent('random');
    fireEvent.click(screen.getByTestId('set-type-button'));
    await waitFor(() => {
      expect(screen.getByTestId('type')).toHaveTextContent('conversation');
    });
  });

  it('おすすめワールドが取得できなかった場合は専用のトーストが呼ばれる', async () => {
    window.dbAPI.getRandomRecommendedWorld = jest.fn().mockResolvedValue(null);
    render(
      <RecommendProvider>
        <ConsumerComponent />
      </RecommendProvider>,
    );
    fireEvent.click(screen.getByTestId('get-world-button'));
    await waitFor(() => {
      expect(window.dbAPI.getRandomRecommendedWorld).toHaveBeenCalled();
      expect(screen.getByTestId('world')).toHaveTextContent('none');
      expect(addToast).toHaveBeenCalledWith('おすすめワールドが見つかりませんでした。', expect.anything());
    });
  });

  it('getRecommendWorldでエラー時はnullになりトーストが呼ばれる', async () => {
    (window.dbAPI.getRandomRecommendedWorld as jest.Mock).mockResolvedValueOnce(mockWorldInfo).mockRejectedValueOnce('APIエラー');
    render(
      <RecommendProvider>
        <ConsumerComponent />
      </RecommendProvider>,
    );
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); // エラーログを抑制
    fireEvent.click(screen.getByTestId('get-world-button'));
    await waitFor(() => {
      expect(screen.getByTestId('world')).toHaveTextContent('none');
      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('ワールド情報の取得に失敗しました。エラー: APIエラー'),
        expect.anything(),
      );
    });
    errorSpy.mockRestore(); // エラーログの抑制を解除
  });

  it('Provider外でuseRecommendStateを使うとエラー', () => {
    const ProviderOutside: React.FC = () => {
      useRecommendState();
      return null;
    };
    expect(() => render(<ProviderOutside />)).toThrow('useRecommendState must be used within a RecommendProvider');
  });
});
