import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {act} from 'react';

import { WorldUpdateProgress } from './world-update-progress';

beforeAll(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

jest.mock('src/consts/const', () => ({
  WORLD_UPDATE_INFO_STATUS: {
    idle: 'idle',
    updating: 'updating',
    noTarget: 'noTarget',
    error: 'error',
    completed: 'completed',
  },
}));

jest.mock('src/react-components/common/button', () => ({
  Button: (props: any) => <button {...props}>{props.children}</button>,
}));

const mockSetUpdateTargetTotal = jest.fn();
const mockSetProcessedCount = jest.fn();
const mockSetWorldInfoIsUpdating = jest.fn();
const mockSetWorldInfoUpdateStatus = jest.fn();

let state = {
  updateTargetTotal: 0,
  setUpdateTargetTotal: mockSetUpdateTargetTotal,
  processedCount: 0,
  setProcessedCount: mockSetProcessedCount,
  worldInfoIsUpdating: false,
  setWorldInfoIsUpdating: mockSetWorldInfoIsUpdating,
  worldInfoUpdateStatus: 'idle',
  setWorldInfoUpdateStatus: mockSetWorldInfoUpdateStatus,
};

jest.mock('src/contexts/settings-tab-provider', () => ({
  useSettingsTabState: () => state,
}));

beforeEach(() => {
  jest.clearAllMocks();
  state = {
    updateTargetTotal: 0,
    setUpdateTargetTotal: mockSetUpdateTargetTotal,
    processedCount: 0,
    setProcessedCount: mockSetProcessedCount,
    worldInfoIsUpdating: false,
    setWorldInfoIsUpdating: mockSetWorldInfoIsUpdating,
    worldInfoUpdateStatus: 'idle',
    setWorldInfoUpdateStatus: mockSetWorldInfoUpdateStatus,
  };
});

describe('WorldUpdateProgress', () => {
  it('初期状態で「未実行」と表示される', () => {
    render(<WorldUpdateProgress />);
    expect(screen.getByText('未実行')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '更新' })).toBeEnabled();
  });

  it('更新対象が0件なら「更新対象なし」と表示される', async () => {
    render(<WorldUpdateProgress />);
    fireEvent.click(screen.getByRole('button', { name: '更新' }));
    await waitFor(() => {
      expect(mockSetWorldInfoIsUpdating).toHaveBeenCalledWith(false);
      expect(mockSetWorldInfoUpdateStatus).toHaveBeenCalledWith('noTarget');
    });
  });

  it('更新中は「更新中: x / y」と表示される', () => {
    state.worldInfoUpdateStatus = 'updating';
    state.processedCount = 1;
    state.updateTargetTotal = 3;
    render(<WorldUpdateProgress />);
    expect(screen.getByText('更新中: 1 / 3')).toBeInTheDocument();
  });

  it('エラー時は「更新中にエラーが発生しました」と表示される', () => {
    state.worldInfoUpdateStatus = 'error';
    render(<WorldUpdateProgress />);
    expect(screen.getByText('更新中にエラーが発生しました')).toBeInTheDocument();
  });

  it('完了時は「更新完了: x / y」と表示される', () => {
    state.worldInfoUpdateStatus = 'completed';
    state.processedCount = 2;
    state.updateTargetTotal = 2;
    render(<WorldUpdateProgress />);
    expect(screen.getByText('更新完了: 2 / 2')).toBeInTheDocument();
  });

  it('更新ボタン押下でAPIが呼ばれ、正常に完了する', async () => {
    window.dbAPI.getWorldIdsToUpdate = jest.fn().mockResolvedValue(['id1', 'id2']);
    window.dbAPI.addOrUpdateWorldInfo = jest.fn().mockResolvedValue({});

    render(<WorldUpdateProgress />);
    fireEvent.click(screen.getByRole('button', { name: '更新' }));

    await waitFor(() => {
      expect(mockSetWorldInfoIsUpdating).toHaveBeenCalledWith(true);
      expect(mockSetProcessedCount).toHaveBeenCalledWith(0);
      expect(mockSetWorldInfoUpdateStatus).toHaveBeenCalledWith('updating');
      expect(window.dbAPI.getWorldIdsToUpdate).toHaveBeenCalled();
      expect(mockSetUpdateTargetTotal).toHaveBeenCalledWith(2);
    });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    await waitFor(() => {
      expect(window.dbAPI.addOrUpdateWorldInfo).toHaveBeenCalledWith('id1');
      expect(window.dbAPI.addOrUpdateWorldInfo).toHaveBeenCalledWith('id2');
      expect(mockSetProcessedCount).toHaveBeenCalledWith(1);
      expect(mockSetProcessedCount).toHaveBeenCalledWith(2);
      expect(mockSetWorldInfoIsUpdating).toHaveBeenCalledWith(false);
      expect(mockSetWorldInfoUpdateStatus).toHaveBeenCalledWith('completed');
    });
  });

  it('更新中にAPIエラーが発生した場合はエラー状態になる', async () => {
    window.dbAPI.getWorldIdsToUpdate = jest.fn().mockResolvedValue(['id1', 'id2']);
    window.dbAPI.addOrUpdateWorldInfo = jest.fn().mockImplementationOnce(() => {
      throw new Error('fail');
    });

    render(<WorldUpdateProgress />);
    fireEvent.click(screen.getByRole('button', { name: '更新' }));

    await waitFor(() => {
      expect(mockSetWorldInfoIsUpdating).toHaveBeenCalledWith(false);
      expect(mockSetWorldInfoUpdateStatus).toHaveBeenCalledWith('error');
    });
  });

  it('更新中はボタンがdisabledになる', () => {
    state.worldInfoIsUpdating = true;
    render(<WorldUpdateProgress />);
    expect(screen.getByRole('button', { name: '更新' })).toBeDisabled();
  });
});
