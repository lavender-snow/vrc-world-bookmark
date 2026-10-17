import { act, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { CreatedInstances } from './created-instances';

import type { CreatedInstance, VRChatInstanceAPI } from 'src/types/vrchat-instance';

const first: CreatedInstance = {
  loggedIn: true, status: 'created', instanceKey: 'first', canClose: true,
  options: { worldId: 'wrld_test', worldName: '最初のワールド', access: 'invitePlus', region: 'jp', thumbnailImageUrl: 'https://api.vrchat.cloud/api/1/file/thumbnail/1/file' },
  createdAt: '2026-10-13T00:00:00Z',
};
const second: CreatedInstance = { ...first, instanceKey: 'second', options: { ...first.options, worldName: '次のワールド', region: 'eu' } };
let api: jest.Mocked<VRChatInstanceAPI>;
beforeEach(() => {
  api = {
    getState: jest.fn(), create: jest.fn(), reset: jest.fn(),
    list: jest.fn().mockResolvedValue({ loggedIn: true, instances: [second, first] }),
    close: jest.fn().mockResolvedValue({ loggedIn: true, instances: [second, { ...first, closeStatus: 'closed' }] }),
  };
  window.vrchatInstances = api;
  window.vrchatInvites = { send: jest.fn().mockResolvedValue(first), listFriends: jest.fn() };
});

it('lists creation settings and invites the selected instance even for the same world', async () => {
  render(<CreatedInstances />);
  const card = await screen.findByRole('article', { name: '最初のワールド' });
  const thumbnail = within(card).getByRole('img', { name: '最初のワールドのサムネイル' });
  expect(thumbnail).toHaveAttribute('src', first.options.thumbnailImageUrl);
  fireEvent.error(thumbnail);
  expect(within(card).getByText('画像なし')).toBeInTheDocument();
  expect(within(card).getByText('Invite+ / Japan')).toBeInTheDocument();
  expect(within(screen.getByRole('article', { name: '次のワールド' })).getByText('Invite+ / Europe')).toBeInTheDocument();
  fireEvent.click(within(card).getByText('このインスタンスへ招待'));
  fireEvent.click(within(card).getByRole('button', { name: '招待を送信する' }));
  await act(async () => {});
  expect(window.vrchatInvites.send).toHaveBeenCalledWith({ worldId: 'wrld_test', instanceKey: 'first', receiverId: 'self', resend: false });
});

it('requires confirmation, allows cancellation and only closes the chosen entry', async () => {
  render(<CreatedInstances />);
  const card = await screen.findByRole('article', { name: '最初のワールド' });
  fireEvent.click(within(card).getByRole('button', { name: 'インスタンスを閉じる' }));
  expect(api.close).not.toHaveBeenCalled();
  fireEvent.click(within(card).getByRole('button', { name: 'キャンセル' }));
  expect(api.close).not.toHaveBeenCalled();
  fireEvent.click(within(card).getByRole('button', { name: 'インスタンスを閉じる' }));
  fireEvent.click(within(card).getByRole('button', { name: '閉鎖を実行する' }));
  expect(await within(card).findByText('閉鎖済み')).toBeInTheDocument();
  expect(api.close).toHaveBeenCalledWith({ instanceKey: 'first', retry: false });
  expect(within(card).queryByText('このインスタンスへ招待')).not.toBeInTheDocument();
  expect(within(screen.getByRole('article', { name: '次のワールド' })).getByRole('button', { name: 'インスタンスを閉じる' })).toBeEnabled();
});

it('disables actions during close and keeps results after leaving and reopening the tab', async () => {
  let finish: (value: unknown) => void;
  api.close.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const view = render(<CreatedInstances />);
  const card = await screen.findByRole('article', { name: '最初のワールド' });
  fireEvent.click(within(card).getByRole('button', { name: 'インスタンスを閉じる' }));
  fireEvent.click(within(card).getByRole('button', { name: '閉鎖を実行する' }));
  expect(within(card).getByRole('button', { name: 'インスタンスを閉じる' })).toBeDisabled();
  view.unmount();
  const result = { loggedIn: true, instances: [{ ...first, closeStatus: 'closed' as const }] };
  api.list.mockResolvedValue(result);
  await act(async () => finish(result));
  render(<CreatedInstances />);
  expect(await screen.findByText('閉鎖済み')).toBeInTheDocument();
  expect(api.close).toHaveBeenCalledTimes(1);
});

it('requires acknowledgement before retrying an uncertain close', async () => {
  api.list.mockResolvedValue({ loggedIn: true, instances: [{ ...first, closeStatus: 'unknown' }] });
  render(<CreatedInstances />);
  const retry = await screen.findByRole('button', { name: '閉鎖を再試行する' });
  expect(retry).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox', { name: '閉鎖を再実行することを確認しました' }));
  fireEvent.click(retry);
  fireEvent.click(screen.getByRole('button', { name: '閉鎖を実行する' }));
  await screen.findByText('閉鎖済み');
  expect(api.close).toHaveBeenCalledWith({ instanceKey: 'first', retry: true });
});

it('hides close actions when ownership is not established', async () => {
  api.list.mockResolvedValue({ loggedIn: true, instances: [{ ...first, canClose: false }] });
  render(<CreatedInstances />);
  await screen.findByRole('article', { name: '最初のワールド' });
  expect(screen.queryByRole('button', { name: 'インスタンスを閉じる' })).not.toBeInTheDocument();
});

it('shows empty and signed-out states', async () => {
  api.list.mockResolvedValue({ loggedIn: true, instances: [] });
  const view = render(<CreatedInstances />);
  await screen.findByText(/作成済みのインスタンスはありません/);
  view.unmount();
  api.list.mockResolvedValue({ loggedIn: false, instances: [] });
  render(<CreatedInstances />);
  await screen.findByText('「設定 → VRChat」でログインしてください。');
  expect(api.close).not.toHaveBeenCalled();
});
