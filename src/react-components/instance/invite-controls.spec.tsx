import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { InviteControls } from './invite-controls';

import type { InstanceState } from 'src/types/vrchat-instance';

const state: InstanceState = { loggedIn: true, status: 'created' };
const send = jest.fn();
beforeEach(() => {
  send.mockClear();
  window.vrchatInvites = {
    send: jest.fn(),
    listFriends: jest.fn().mockResolvedValue({ ok: true, hasMore: true, friends: [{ id: 'friend', displayName: 'Alice', offline: false }] }),
  };
});

it('offers self invite without fetching friends', () => {
  render(<InviteControls state={state} busy={false} onSend={send} />);
  fireEvent.click(screen.getByRole('button', { name: '招待を送信する' }));
  expect(send).toHaveBeenCalledWith('self', false);
  expect(window.vrchatInvites.listFriends).not.toHaveBeenCalled();
});

it('loads friends, selects an explicit recipient and pages on demand', async () => {
  render(<InviteControls state={state} busy={false} onSend={send} />);
  fireEvent.click(screen.getByRole('button', { name: 'フレンドを表示' }));
  await screen.findByRole('option', { name: 'Alice' });
  fireEvent.change(screen.getByLabelText('招待するユーザー'), { target: { value: 'friend' } });
  fireEvent.click(screen.getByRole('button', { name: '招待を送信する' }));
  expect(send).toHaveBeenCalledWith('friend', false);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: '次へ' })); });
  expect(window.vrchatInvites.listFriends).toHaveBeenLastCalledWith({ offline: false, offset: 100 });
});

it('requires acknowledgement to resend an uncertain invitation', () => {
  render(<InviteControls state={{ ...state, invites: { self: { status: 'unknown', receiverName: '自分' } } }} busy={false} onSend={send} />);
  const button = screen.getByRole('button', { name: '招待を再送する' });
  expect(button).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(button);
  expect(send).toHaveBeenCalledWith('self', true);
});

it('prevents another send while main is sending even after reopening the UI', () => {
  render(<InviteControls state={{ ...state, invites: { friend: { status: 'sending', receiverName: 'Alice' } } }} busy={false} onSend={send} />);
  expect(screen.getByRole('button', { name: '招待を送信中…' })).toBeDisabled();
});
