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
      disabled={props.disabled}
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
    window.vrchatAPI = { fetchWorldInfo: jest.fn(), getCurrentWorld: jest.fn().mockResolvedValue({ ok: true, worldId: WORLD_ID }) };
    window.dbAPI.addOrUpdateWorldInfo = jest.fn().mockResolvedValue({ data: { id: WORLD_ID, name: WORLD_NAME }, upsertResult: UPSERT_RESULT.insert });
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
    expect(screen.getByRole('button', { name: '今いるワールドを登録' })).toBeEnabled();
  });

  it('現在地からワールドを登録し、入力欄と結果を更新する', async () => {
    render(<WorldDataEntry />);
    fireEvent.click(screen.getByRole('button', { name: '今いるワールドを登録' }));
    await waitFor(() => expect(useWorldDataEntryState().setVRChatWorldInfo).toHaveBeenCalledWith({ id: WORLD_ID, name: WORLD_NAME }));
    expect(window.vrchatAPI.getCurrentWorld).toHaveBeenCalledTimes(1);
    expect(window.dbAPI.addOrUpdateWorldInfo).toHaveBeenCalledWith(WORLD_ID);
    expect(useWorldDataEntryState().setWorldIdOrUrl).toHaveBeenCalledWith(WORLD_ID);
    expect(addToast).toHaveBeenCalledWith('新しいワールド情報を登録しました。', expect.anything());
  });

  it.each([
    ['unauthorized', '設定の「VRChat」'],
    ['notInWorld', 'ワールドに入ってから'],
    ['rateLimited', '時間を置いて'],
    ['network', '接続を確認'],
  ])('現在地取得が%sの場合は理由を表示し、登録しない', async (code, message) => {
    jest.mocked(window.vrchatAPI.getCurrentWorld).mockResolvedValueOnce({ ok: false, error: { code } } as any);
    render(<WorldDataEntry />);
    fireEvent.click(screen.getByRole('button', { name: '今いるワールドを登録' }));
    await waitFor(() => expect(addToast).toHaveBeenCalledWith(expect.stringContaining(message), expect.anything()));
    expect(window.dbAPI.addOrUpdateWorldInfo).not.toHaveBeenCalled();
    expect(useWorldDataEntryState().setWorldIdOrUrl).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '今いるワールドを登録' })).toBeEnabled();
  });

  it('登録完了まで連打と手入力での同時登録を防ぐ', async () => {
    useWorldDataEntryState().worldIdOrUrl = WORLD_ID;
    let finish: (value: any) => void;
    jest.mocked(window.dbAPI.addOrUpdateWorldInfo).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    render(<WorldDataEntry />);
    fireEvent.click(screen.getByRole('button', { name: '今いるワールドを登録' }));
    await waitFor(() => expect(window.dbAPI.addOrUpdateWorldInfo).toHaveBeenCalledTimes(1));
    expect(screen.getByPlaceholderText('World ID or World URL')).toBeDisabled();
    expect(screen.getByRole('button', { name: '現在のワールドを登録中…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'ワールド情報登録' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '現在のワールドを登録中…' }));
    fireEvent.keyDown(screen.getByPlaceholderText('World ID or World URL'), { key: 'Enter' });
    expect(window.vrchatAPI.getCurrentWorld).toHaveBeenCalledTimes(1);
    expect(window.dbAPI.addOrUpdateWorldInfo).toHaveBeenCalledTimes(1);
    finish({ data: { id: WORLD_ID, name: WORLD_NAME }, upsertResult: UPSERT_RESULT.update });
    await waitFor(() => expect(addToast).toHaveBeenCalledWith('既存のワールド情報を更新しました。', expect.anything()));
    expect(screen.getByRole('button', { name: '今いるワールドを登録' })).toBeEnabled();
  });

  it('通信例外の後も現在地取得を再試行できる', async () => {
    jest.mocked(window.vrchatAPI.getCurrentWorld).mockRejectedValueOnce(new Error('IPC failure'));
    render(<WorldDataEntry />);
    fireEvent.click(screen.getByRole('button', { name: '今いるワールドを登録' }));
    await waitFor(() => expect(addToast).toHaveBeenCalledWith(expect.stringContaining('登録に失敗'), expect.anything()));
    fireEvent.click(screen.getByRole('button', { name: '今いるワールドを登録' }));
    await waitFor(() => expect(window.dbAPI.addOrUpdateWorldInfo).toHaveBeenCalledWith(WORLD_ID));
  });

  it('現在地取得中に画面を離れた場合は登録を開始しない', async () => {
    let finish: (value: any) => void;
    jest.mocked(window.vrchatAPI.getCurrentWorld).mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
    const { unmount } = render(<WorldDataEntry />);
    fireEvent.click(screen.getByRole('button', { name: '今いるワールドを登録' }));
    unmount();
    finish({ ok: true, worldId: WORLD_ID });
    await waitFor(() => expect(window.vrchatAPI.getCurrentWorld).toHaveBeenCalledTimes(1));
    expect(window.dbAPI.addOrUpdateWorldInfo).not.toHaveBeenCalled();
    expect(useWorldDataEntryState().setWorldIdOrUrl).not.toHaveBeenCalled();
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
