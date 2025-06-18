import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { RecommendProvider, useRecommendState } from './recommend-provider';

import { mockWorldInfo } from '__mocks__/test-data';

function ConsumerComponent() {
  const { vrchatWorldInfo, setVRChatWorldInfo } = useRecommendState();
  return (
    <div>
      <span data-testid="world">{vrchatWorldInfo ? vrchatWorldInfo.name : 'none'}</span>
      <button
        onClick={() =>
          act(() => setVRChatWorldInfo(mockWorldInfo))
        }
      >
        set
      </button>
    </div>
  );
}

describe('RecommendProvider', () => {
  it('初期値はnull', () => {
    render(
      <RecommendProvider>
        <ConsumerComponent />
      </RecommendProvider>,
    );
    expect(screen.getByTestId('world')).toHaveTextContent('none');
  });

  it('setVRChatWorldInfoで値が更新される', () => {
    render(
      <RecommendProvider>
        <ConsumerComponent />
      </RecommendProvider>,
    );
    screen.getByText('set').click();
    expect(screen.getByTestId('world')).toHaveTextContent(mockWorldInfo.name);
  });

  it('Provider外でuseRecommendStateを使うとエラー', () => {
    const ProviderOutside: React.FC = () => {
      useRecommendState();
      return null;
    };
    expect(() => render(<ProviderOutside />)).toThrow('useRecommendState must be used within a RecommendProvider');
  });
});
