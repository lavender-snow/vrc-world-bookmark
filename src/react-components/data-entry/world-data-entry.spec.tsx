import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { WorldDataEntry } from './world-data-entry';

import '@testing-library/jest-dom';
import { UPSERT_RESULT } from 'src/consts/const';
import { useWorldDataEntryState } from 'src/contexts/world-data-entry-provider';

const WORLD_ID = 'wrld_15fe33f1-937e-4e93-8a40-902fb9552a11';
const WORLD_NAME = 'VerySimpleWorld';

jest.mock('commonComponents/button', () => ({
  Button: (props: any) => <button {...props}>{props.children}</button>,
}));
jest.mock('commonComponents/input-text', () => ({
  InputText: (props: any) => (
    <input
      value={props.value}
      onChange={props.onChange}
      onKeyDown={props.onKeyDown}
      onBlur={props.onBlur}
      placeholder={props.placeholder}
      className={props.className}
    />
  ),
}));
jest.mock('commonComponents/world-card', () => ({
  WorldCard: (props: any) => <div data-testid="mock-world-card">{JSON.stringify(props.worldInfo)}</div>,
}));

const addToast = jest.fn();
jest.mock('src/contexts/toast-provider', () => ({
  useToast: () => ({
    addToast,
  }),
}));
jest.mock('src/contexts/world-data-entry-provider', () => {
  const state = {
    worldIdOrUrl: '',
    setWorldIdOrUrl: jest.fn(),
    vrchatWorldInfo: {},
    setVRChatWorldInfo: jest.fn(),
  };
  return {
    useWorldDataEntryState: () => state,
  };
});
jest.mock('src/utils/util', () => ({
  debounce: (fn: any) => fn,
  getWorldId: (value: string) => {
    if (value === WORLD_ID) return value;
    if (value === `https://vrchat.com/home/world/${WORLD_ID}/info`) return WORLD_ID;
    return null;
  },
}));

describe('WorldDataEntry', () => {
  beforeEach(() => {
    const state = useWorldDataEntryState();
    Object.assign(state, {
      worldIdOrUrl: '',
      setWorldIdOrUrl: jest.fn(),
      vrchatWorldInfo: { id: 'wrld_15fe33f1-937e-4e93-8a40-902fb9552a11', name: 'VerySimpleWorld' },
      setVRChatWorldInfo: jest.fn(),
    });
    jest.clearAllMocks();
  });

  it('入力欄とボタンが表示される', () => {
    render(<WorldDataEntry />);
    expect(screen.getByPlaceholderText('World ID or World URL')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ワールド情報登録' })).toBeInTheDocument();
  });

  it('無効なID入力時にエラーメッセージが表示される', async () => {
    const state = useWorldDataEntryState();
    state.worldIdOrUrl = 'invalid';
    render(<WorldDataEntry />);
    const inputText = screen.getByPlaceholderText('World ID or World URL');
    fireEvent.change(inputText, { target: { value: 'invalid' } });
    fireEvent.blur(inputText);

    await waitFor(() => {
      expect(screen.getByText(/無効なワールドIDまたはURL/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ワールド情報登録' })).toBeDisabled();
    });
  });

  it('有効なID入力時はボタンが有効', async () => {
    const state = useWorldDataEntryState();
    state.worldIdOrUrl = WORLD_ID;
    render(<WorldDataEntry />);
    const inputText = screen.getByPlaceholderText('World ID or World URL');
    fireEvent.change(inputText, { target: { value: WORLD_ID } });
    fireEvent.blur(inputText);

    await waitFor(() => {
      expect(screen.queryByText(/無効なワールドIDまたはURL/)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ワールド情報登録' })).toBeEnabled();
    });
  });

  it('ボタン押下でAPIが呼ばれ、新規登録トーストとsetVRChatWorldInfoが呼ばれる', async () => {
    // const setVRChatWorldInfo = jest.fn();
    const state = useWorldDataEntryState();
    state.worldIdOrUrl = WORLD_ID;
    window.dbAPI.addOrUpdateWorldInfo = jest.fn().mockResolvedValue({ data: { id: WORLD_ID, name: WORLD_NAME }, upsertResult: UPSERT_RESULT.insert });

    render(<WorldDataEntry />);
    fireEvent.click(screen.getByRole('button', { name: 'ワールド情報登録' }));

    await waitFor(() => {
      expect(window.dbAPI.addOrUpdateWorldInfo).toHaveBeenCalledWith(WORLD_ID);
      expect(addToast).toHaveBeenCalledWith('新しいワールド情報を登録しました。', expect.anything());
      expect(state.setVRChatWorldInfo).toHaveBeenCalledWith({ id: WORLD_ID, name: WORLD_NAME });
    });
  });

  it('ボタン押下でAPIが呼ばれ、情報更新トーストとsetVRChatWorldInfoが呼ばれる', async () => {
    // const setVRChatWorldInfo = jest.fn();
    const state = useWorldDataEntryState();
    state.worldIdOrUrl = WORLD_ID;
    window.dbAPI.addOrUpdateWorldInfo = jest.fn().mockResolvedValue({ data: { id: WORLD_ID, name: WORLD_NAME }, upsertResult: UPSERT_RESULT.update });

    render(<WorldDataEntry />);
    fireEvent.click(screen.getByRole('button', { name: 'ワールド情報登録' }));

    await waitFor(() => {
      expect(window.dbAPI.addOrUpdateWorldInfo).toHaveBeenCalledWith(WORLD_ID);
      expect(addToast).toHaveBeenCalledWith('既存のワールド情報を更新しました。', expect.anything());
      expect(state.setVRChatWorldInfo).toHaveBeenCalledWith({ id: WORLD_ID, name: WORLD_NAME });
    });
  });

  it('APIエラー時はエラートーストが表示される', async () => {
    const state = useWorldDataEntryState();
    state.worldIdOrUrl = WORLD_ID;

    window.dbAPI.addOrUpdateWorldInfo = jest.fn().mockResolvedValue({ error: 'APIエラー', data: null });

    render(<WorldDataEntry />);
    fireEvent.click(screen.getByRole('button', { name: 'ワールド情報登録' }));
    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('ワールド情報の取得に失敗しました。エラー: APIエラー'),
        expect.anything(),
      );
    });
  });

  it('APIがデータもエラーも返さない場合は予期せぬエラーのトースト', async () => {
    const state = useWorldDataEntryState();
    state.worldIdOrUrl = WORLD_ID;
    window.dbAPI.addOrUpdateWorldInfo = jest.fn().mockResolvedValue({});

    render(<WorldDataEntry />);
    fireEvent.click(screen.getByRole('button', { name: 'ワールド情報登録' }));

    await waitFor(() => {
      expect(addToast).toHaveBeenCalledWith(
        expect.stringContaining('予期せぬエラーが発生しました。'),
        expect.anything(),
      );
    });
  });

  it('WorldCardが表示される', () => {
    const state = useWorldDataEntryState();
    state.worldIdOrUrl = WORLD_ID;

    render(<WorldDataEntry />);
    expect(screen.getByTestId('mock-world-card')).toBeInTheDocument();
    expect(screen.getByTestId('mock-world-card').textContent).toContain(WORLD_NAME);
  });
});
