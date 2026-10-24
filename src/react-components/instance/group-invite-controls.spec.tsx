import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { GroupInviteControls } from './group-invite-controls';

import type { InstanceState } from 'src/types/vrchat-instance';

const members = [{ id: 'a', displayName: 'Alice' }, { id: 'b', displayName: 'Bob' }, { id: 'c', displayName: 'Carol' }];
const state: InstanceState = {
  loggedIn: true, status: 'created', instanceKey: 'instance',
  options: { worldId: 'world', worldName: '移動先', access: 'invitePlus', region: 'jp' },
  invites: { a: { status: 'sent', receiverName: 'Alice' }, b: { status: 'unknown', receiverName: 'Bob' } },
};
beforeEach(() => {
  window.vrchatGroups = {
    list: jest.fn().mockResolvedValue({ ok: true, accountId: 'user', groups: [{ id: 'g', name: '仲間', members }] }),
    save: jest.fn(), remove: jest.fn(), send: jest.fn(), cancel: jest.fn(),
  };
});

it('shows recipients and requires acknowledgement to include unknown results', async () => {
  const send = jest.fn();
  render(<GroupInviteControls state={state} busy={false} onSend={send} onCancel={jest.fn()} />);
  expect(await screen.findByRole('button', { name: '仲間（3人）' })).toHaveAttribute('aria-pressed', 'true');
  expect(window.vrchatGroups.list).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: 'グループを選ぶ' })).not.toBeInTheDocument();
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  expect(send).not.toHaveBeenCalled();
  expect(screen.getByText('Alice — 送信済み')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '1人にまとめて招待' }));
  expect(send).toHaveBeenLastCalledWith('g', false);
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: '2人にまとめて招待' }));
  expect(send).toHaveBeenLastCalledWith('g', true);
});

it('restores progress from main and offers cancellation while disabling another group send', async () => {
  const cancel = jest.fn();
  render(<GroupInviteControls state={{ ...state, groupInvite: { groupName: '仲間', members, status: 'sending' } }} busy={false} onSend={jest.fn()} onCancel={cancel} />);
  expect(await screen.findByRole('button', { name: '仲間（3人）' })).toBeDisabled();
  expect(screen.getByRole('status')).toHaveTextContent('送信済み 1 / 3人');
  fireEvent.click(screen.getByRole('button', { name: '残りの招待を停止' }));
  expect(cancel).toHaveBeenCalledTimes(1);
});

it('shows failed and unattempted members after a rate limit stop', async () => {
  render(<GroupInviteControls state={{ ...state, groupInvite: { groupName: '仲間', members, status: 'stopped', error: { code: 'rateLimited' } } }} busy={false} onSend={jest.fn()} onCancel={jest.fn()} />);
  expect(screen.getByRole('alert')).toHaveTextContent('アクセスが集中したため停止しました');
  expect(await screen.findByText('Carol — 未送信')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: '残りの招待を停止' })).not.toBeInTheDocument();
  await screen.findByRole('group', { name: '招待するグループ' });
});

it('prevents group sends to a closed instance', async () => {
  render(<GroupInviteControls state={{ ...state, closeStatus: 'closed' }} busy={false} onSend={jest.fn()} onCancel={jest.fn()} />);
  expect(await screen.findByRole('button', { name: '仲間（3人）' })).toBeDisabled();
});

it('lets the user choose directly when several groups exist and recovers a failed initial load', async () => {
  jest.mocked(window.vrchatGroups.list).mockRejectedValueOnce(new Error('IPC')).mockResolvedValueOnce({
    ok: true, accountId: 'user', groups: [{ id: 'g', name: '仲間', members }, { id: 'other', name: '散歩', members }],
  });
  const send = jest.fn();
  render(<GroupInviteControls state={state} busy={false} onSend={send} onCancel={jest.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'グループの読み込みを再試行' }));
  const other = await screen.findByRole('button', { name: '散歩（3人）' });
  const first = screen.getByRole('button', { name: '仲間（3人）' });
  expect(first).toHaveAttribute('aria-pressed', 'false');
  expect(other).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(first);
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(other);
  expect(first).toHaveAttribute('aria-pressed', 'false');
  expect(other).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('checkbox')).not.toBeChecked();
  expect(send).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '1人にまとめて招待' }));
  expect(send).toHaveBeenCalledWith('other', false);
});
