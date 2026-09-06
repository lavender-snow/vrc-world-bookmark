import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { VRChatSettings } from './vrchat-settings';

import type { AuthResult, AuthState, VRChatAuthAPI } from 'src/types/vrchat-auth';

const signedOut: AuthState = { status: 'signedOut', persistence: 'none' };
const authenticated: AuthState = { status: 'authenticated', persistence: 'saved', user: { id: 'usr_test', displayName: 'テストユーザー' } };
let api: jest.Mocked<VRChatAuthAPI>;

beforeEach(() => {
  api = {
    getAuthState: jest.fn().mockResolvedValue(signedOut),
    restoreSession: jest.fn().mockResolvedValue({ ok: true, state: authenticated }),
    login: jest.fn().mockResolvedValue({ ok: true, state: authenticated }),
    verifyTwoFactor: jest.fn().mockResolvedValue({ ok: true, state: authenticated }),
    logout: jest.fn().mockResolvedValue({ ok: true, state: signedOut }),
  };
  window.vrchatAuth = api;
});

async function enterLogin() {
  fireEvent.change(await screen.findByLabelText('ユーザー名'), { target: { value: 'test-user' } });
  fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'secret-password' } });
}

it('logs in via form submission, clears the password immediately and prevents double submission', async () => {
  let finish: (value: AuthResult) => void;
  api.login.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  render(<VRChatSettings />);
  await enterLogin();
  const form = screen.getByLabelText('パスワード').closest('form');
  fireEvent.submit(form);
  expect(screen.getByLabelText('パスワード')).toHaveValue('');
  expect(screen.getByRole('button', { name: 'ログイン' })).toBeDisabled();
  fireEvent.submit(form);
  expect(api.login).toHaveBeenCalledTimes(1);
  expect(api.login).toHaveBeenCalledWith({ username: 'test-user', password: 'secret-password' });
  await act(async () => finish({ ok: true, state: authenticated }));
  expect(screen.getByText('テストユーザー')).toBeInTheDocument();
  expect(screen.queryByLabelText('パスワード')).not.toBeInTheDocument();
});

it.each(['totp', 'emailOtp'] as const)('completes a %s challenge and clears the code', async method => {
  api.getAuthState.mockResolvedValue({ status: 'twoFactorRequired', methods: [method], persistence: 'memory' });
  render(<VRChatSettings />);
  const input = await screen.findByLabelText('確認コード');
  expect(screen.getByText(method === 'totp' ? /認証アプリに表示される/ : /メールで届いた/)).toBeInTheDocument();
  fireEvent.change(input, { target: { value: '123456' } });
  fireEvent.submit(input.closest('form'));
  expect(input).toHaveValue('');
  await screen.findByText('テストユーザー');
  expect(api.verifyTwoFactor).toHaveBeenCalledWith({ method, code: '123456' });
});

it('lets the user choose supported verification methods without carrying over the code', async () => {
  api.getAuthState.mockResolvedValue({ status: 'twoFactorRequired', methods: ['totp', 'otp', 'emailOtp'], persistence: 'memory' });
  render(<VRChatSettings />);
  fireEvent.change(await screen.findByLabelText('確認コード'), { target: { value: '123456' } });
  fireEvent.change(screen.getByLabelText('確認方法'), { target: { value: 'emailOtp' } });
  expect(screen.getByLabelText('確認コード')).toHaveValue('');
  expect(screen.getByRole('button', { name: '確認する' })).toBeDisabled();
  expect(screen.getAllByRole('option')).toHaveLength(2);
});

it('supports cancelling an unknown challenge', async () => {
  api.getAuthState.mockResolvedValue({ status: 'twoFactorRequired', methods: ['unknown'], persistence: 'memory' });
  render(<VRChatSettings />);
  expect(await screen.findByRole('alert')).toHaveTextContent('まだ対応していません');
  expect(screen.queryByLabelText('確認コード')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'ログインを中止' }));
  await screen.findByLabelText('ユーザー名');
  expect(api.logout).toHaveBeenCalledTimes(1);
});

it('shows a memory-only login warning and reflects local logout even when the server is unreachable', async () => {
  api.getAuthState.mockResolvedValue({ ...authenticated, persistence: 'memory', error: { code: 'storage' } });
  api.logout.mockResolvedValue({ ok: false, state: signedOut, error: { code: 'network' } });
  render(<VRChatSettings />);
  expect(await screen.findByRole('alert')).toHaveTextContent('ログインできましたが、保存できませんでした');
  fireEvent.click(screen.getByRole('button', { name: 'ログアウト' }));
  await screen.findByLabelText('ユーザー名');
  expect(screen.queryByText('テストユーザー')).not.toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('接続できませんでした');
});

it('allows retrying failed session restoration', async () => {
  api.getAuthState.mockResolvedValue({ status: 'restoreFailed', persistence: 'none', error: { code: 'network' } });
  render(<VRChatSettings />);
  fireEvent.click(await screen.findByRole('button', { name: 'ログイン状態を復元' }));
  await screen.findByText('テストユーザー');
  expect(api.restoreSession).toHaveBeenCalledTimes(1);
  expect(api.login).not.toHaveBeenCalled();
});

it('can retry a failed initial IPC call without exposing the raw error', async () => {
  api.getAuthState.mockRejectedValueOnce(new Error('secret exception')).mockResolvedValueOnce(signedOut);
  render(<VRChatSettings />);
  expect(await screen.findByRole('alert')).not.toHaveTextContent('secret exception');
  fireEvent.click(screen.getByRole('button', { name: '状態を再確認' }));
  await screen.findByLabelText('ユーザー名');
});

it('refreshes a startup restoration until completed', async () => {
  jest.useFakeTimers();
  try {
    api.getAuthState.mockResolvedValueOnce({ status: 'restoring', persistence: 'none' }).mockResolvedValueOnce(authenticated);
    render(<VRChatSettings />);
    await act(async () => {});
    expect(screen.getByRole('status')).toHaveTextContent('保存済み');
    await act(async () => { jest.advanceTimersByTime(750); });
    expect(screen.getByText('テストユーザー')).toBeInTheDocument();
    expect(api.getAuthState).toHaveBeenCalledTimes(2);
  } finally { jest.useRealTimers(); }
});

it('disables login during a rate-limit cooldown', async () => {
  jest.useFakeTimers();
  try {
    api.getAuthState.mockResolvedValue({ ...signedOut, error: { code: 'rateLimited', retryAfterMs: 2000 } });
    render(<VRChatSettings />);
    await act(async () => {});
    expect(screen.getByLabelText('ユーザー名')).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('あと2秒');
    await act(async () => { jest.advanceTimersByTime(1000); });
    await act(async () => { jest.advanceTimersByTime(1000); });
    expect(screen.getByLabelText('ユーザー名')).toBeEnabled();
  } finally { jest.useRealTimers(); }
});

it('rereads main state after reopening the tab instead of retaining credentials', async () => {
  const first = render(<VRChatSettings />);
  await enterLogin();
  first.unmount();
  render(<VRChatSettings />);
  expect(await screen.findByLabelText('パスワード')).toHaveValue('');
  await waitFor(() => expect(api.getAuthState).toHaveBeenCalledTimes(2));
});
