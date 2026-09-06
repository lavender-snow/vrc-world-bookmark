import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { InstanceCreator } from './instance-creator';

import type { InstanceState, VRChatInstanceAPI } from 'src/types/vrchat-instance';

const worldId = 'wrld_test';
const idle: InstanceState = { loggedIn: true, status: 'idle' };
const created: InstanceState = { loggedIn: true, status: 'created', options: { worldId, access: 'invite', region: 'jp' }, createdAt: '2026-09-07T00:00:00Z' };
let api: jest.Mocked<VRChatInstanceAPI>;
beforeAll(() => {
  // jsdom does not implement the native dialog API.
  HTMLDialogElement.prototype.showModal = jest.fn(function(this: HTMLDialogElement) {
    this.setAttribute('open', '');
    this.querySelector<HTMLElement>('button')?.focus();
  });
  HTMLDialogElement.prototype.close = jest.fn(function(this: HTMLDialogElement) { this.removeAttribute('open'); });
});
beforeEach(() => {
  api = {
    getState: jest.fn().mockResolvedValue(idle),
    create: jest.fn().mockResolvedValue(created),
    reset: jest.fn().mockResolvedValue(idle),
  };
  window.vrchatInstances = api;
});
function open() {
  render(<InstanceCreator worldId={worldId} worldName="テストワールド" />);
  fireEvent.click(screen.getByRole('button', { name: 'インスタンスを作成' }));
}

it('uses Invite+/Japan defaults with English region names and submits selected options once', async () => {
  open();
  expect(await screen.findByLabelText('公開範囲')).toHaveValue('invitePlus');
  expect(screen.getByLabelText('リージョン')).toHaveValue('jp');
  for (const name of ['Japan', 'US West', 'US East', 'Europe']) expect(screen.getByRole('option', { name })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('公開範囲'), { target: { value: 'friendsPlus' } });
  fireEvent.change(screen.getByLabelText('リージョン'), { target: { value: 'eu' } });
  fireEvent.click(screen.getByRole('button', { name: 'この設定で作成' }));
  await screen.findByText('インスタンスを作成しました。');
  expect(api.create).toHaveBeenCalledWith({ worldId, access: 'friendsPlus', region: 'eu' });
  expect(screen.queryByRole('button', { name: 'この設定で作成' })).not.toBeInTheDocument();
});

it('directs signed-out users to settings without showing a creation form', async () => {
  api.getState.mockResolvedValue({ status: 'idle', loggedIn: false });
  open();
  await screen.findByText(/設定 → VRChat/);
  expect(screen.queryByLabelText('公開範囲')).not.toBeInTheDocument();
  expect(api.create).not.toHaveBeenCalled();
});

it('requires acknowledgement before resetting an unknown outcome and never automatically resends', async () => {
  api.getState.mockResolvedValue({ status: 'unknown', loggedIn: true });
  open();
  expect(await screen.findByRole('alert')).toHaveTextContent('作成結果が不明');
  const button = screen.getByRole('button', { name: '別のインスタンスの作成に進む' });
  expect(button).toBeDisabled();
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(button);
  await screen.findByLabelText('公開範囲');
  expect(api.reset).toHaveBeenCalledWith(worldId);
  expect(api.create).not.toHaveBeenCalled();
});

it('restores creation results after closing and reopening the modal', async () => {
  api.getState.mockResolvedValue(created);
  open();
  await screen.findByText('インスタンスを作成しました。');
  fireEvent.click(screen.getByRole('button', { name: '作成モーダルを閉じる' }));
  fireEvent.click(screen.getByRole('button', { name: 'インスタンスを作成' }));
  await screen.findByText('インスタンスを作成しました。');
  expect(api.getState).toHaveBeenCalledTimes(2);
  expect(api.create).not.toHaveBeenCalled();
});

it('opens a labelled native modal and restores focus after Escape', async () => {
  render(<InstanceCreator worldId={worldId} worldName="テストワールド" />);
  const trigger = screen.getByRole('button', { name: 'インスタンスを作成' });
  trigger.focus();
  fireEvent.click(trigger);
  const dialog = screen.getByRole('dialog', { name: 'インスタンスを作成' });
  expect(dialog).toHaveAttribute('open');
  await screen.findByLabelText('公開範囲');
  fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  expect(api.create).not.toHaveBeenCalled();
});

it('disables submission while pending and retains main state on completion', async () => {
  let finish: (state: InstanceState) => void;
  api.create.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  open();
  fireEvent.click(await screen.findByRole('button', { name: 'この設定で作成' }));
  expect(screen.getByRole('button', { name: '作成中…' })).toBeDisabled();
  await act(async () => finish(created));
  await screen.findByText('インスタンスを作成しました。');
  expect(api.create).toHaveBeenCalledTimes(1);
});
