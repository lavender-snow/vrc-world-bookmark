import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { FriendGroups } from './friend-groups';

const accountId = 'account';
const alice = { id: 'alice', displayName: 'Alice', offline: false };
const bob = { id: 'bob', displayName: 'Bob', offline: true };
beforeEach(() => {
  window.vrchatGroups = {
    list: jest.fn().mockResolvedValue({ ok: true, accountId, groups: [] }),
    save: jest.fn().mockResolvedValue({ ok: true, accountId, groups: [{ id: 'g', name: '仲間', members: [alice, bob] }] }),
    remove: jest.fn().mockResolvedValue({ ok: true, accountId, groups: [] }),
    send: jest.fn(), cancel: jest.fn(),
  };
  window.vrchatInvites = { listFriends: jest.fn().mockResolvedValue({ ok: true, friends: [alice], hasMore: true }), send: jest.fn() };
});

it('keeps selected members across pages and online/offline filters, then saves the group', async () => {
  render(<FriendGroups />);
  fireEvent.change(await screen.findByLabelText('グループ名'), { target: { value: '仲間' } });
  fireEvent.click(screen.getByRole('button', { name: 'フレンド一覧を更新' }));
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Alice' }));
  jest.mocked(window.vrchatInvites.listFriends).mockResolvedValueOnce({ ok: true, friends: [], hasMore: false });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '次へ' })); });
  expect(screen.getByRole('button', { name: 'Aliceを外す' })).toBeInTheDocument();
  jest.mocked(window.vrchatInvites.listFriends).mockResolvedValueOnce({ ok: true, friends: [bob], hasMore: false });
  fireEvent.change(screen.getByLabelText('フレンドの状態'), { target: { value: 'offline' } });
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Bob' }));
  fireEvent.click(screen.getByRole('button', { name: 'グループを保存' }));
  await screen.findByText('グループを保存しました。');
  expect(window.vrchatGroups.save).toHaveBeenCalledWith({ accountId, id: undefined, name: '仲間', memberIds: ['alice', 'bob'] });
  expect(screen.getByRole('button', { name: '「仲間」を編集' })).toBeInTheDocument();
});

it('edits persisted members without fetching friends and confirms deletion', async () => {
  jest.mocked(window.vrchatGroups.list).mockResolvedValue({ ok: true, accountId, groups: [{ id: 'g', name: '仲間', members: [alice, bob] }] });
  render(<FriendGroups />);
  fireEvent.click(await screen.findByRole('button', { name: '「仲間」を編集' }));
  fireEvent.click(screen.getByRole('button', { name: 'Bobを外す' }));
  fireEvent.change(screen.getByLabelText('グループ名'), { target: { value: '散歩' } });
  fireEvent.click(screen.getByRole('button', { name: 'グループを保存' }));
  await waitFor(() => expect(window.vrchatGroups.save).toHaveBeenCalledWith({ accountId, id: 'g', name: '散歩', memberIds: ['alice'] }));
  expect(window.vrchatInvites.listFriends).not.toHaveBeenCalled();
  await screen.findByText('グループを保存しました。');
  fireEvent.click(screen.getByRole('button', { name: '「仲間」を削除' }));
  expect(window.vrchatGroups.remove).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '削除を実行する' }));
  await screen.findByText('グループを削除しました。');
  expect(window.vrchatGroups.remove).toHaveBeenCalledWith({ accountId, id: 'g' });
});

it('keeps the draft on storage failure and clears it on account changes', async () => {
  jest.useFakeTimers();
  try {
    jest.mocked(window.vrchatGroups.save).mockResolvedValue({ ok: false, error: { code: 'storage' } });
    render(<FriendGroups />);
    await act(async () => {});
    fireEvent.change(screen.getByLabelText('グループ名'), { target: { value: '保存したい名前' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'グループを保存' })); });
    expect(screen.getByRole('alert')).toHaveTextContent('保存できませんでした');
    expect(screen.getByLabelText('グループ名')).toHaveValue('保存したい名前');
    jest.mocked(window.vrchatGroups.list).mockResolvedValue({ ok: true, accountId: 'another', groups: [] });
    await act(async () => { jest.advanceTimersByTime(1500); });
    expect(screen.getByLabelText('グループ名')).toHaveValue('');
  } finally { jest.useRealTimers(); }
});

it('shows the login guidance without fetching friends when signed out', async () => {
  jest.mocked(window.vrchatGroups.list).mockResolvedValue({ ok: true, accountId: null, groups: [] });
  render(<FriendGroups />);
  await screen.findByText('「設定 → VRChat」でログインしてください。');
  expect(screen.queryByLabelText('グループ名')).not.toBeInTheDocument();
  expect(window.vrchatInvites.listFriends).not.toHaveBeenCalled();
});
